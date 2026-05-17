const { User, Order, Product, FastFood, AdminAuditLog, LoginHistory } = require('../models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logAdminAction } = require('../middleware/auditLog');
const { sendMultiChannelNotification } = require('../utils/notificationManager');

/**
 * Generate a random temporary password
 */
const generateTempPassword = (length = 12) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

exports.forceResetPassword = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate and hash temporary password
    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Update user
    user.password = hashedPassword;
    user.mustChangePassword = true;
    
    // Also invalidate tokens so they are forced to use the new password
    if (user.tokenVersion !== undefined) {
       user.tokenVersion += 1;
       user.tokenInvalidatedAt = new Date();
    }
    
    await user.save();

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'FORCE_RESET_PASSWORD',
      targetType: 'User',
      targetId: user.id,
      targetName: user.email || user.phone || user.name,
      details: { message: 'Admin generated a temporary password.' },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Send notification
    await sendMultiChannelNotification(user, 'password_reset_admin', {
      tempPassword: tempPassword,
      userName: user.name || 'User'
    });

    res.json({ message: 'Password reset successfully. A temporary password has been sent to the user.', tempPassword }); // Might want to hide tempPassword in production, but good for admin to see
  } catch (error) {
    console.error('[AdminTools] Force Reset Password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.mergeAccounts = async (req, res) => {
  try {
    const { sourceUserId, targetUserId, adminPassword } = req.body;

    if (!sourceUserId || !targetUserId || !adminPassword) {
      return res.status(400).json({ message: 'Source User ID, Target User ID, and Admin Password are required.' });
    }

    if (sourceUserId === targetUserId) {
      return res.status(400).json({ message: 'Source and Target users cannot be the same.' });
    }

    // Verify admin password
    const adminUser = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(adminPassword, adminUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin password.' });
    }

    const sourceUser = await User.findByPk(sourceUserId);
    const targetUser = await User.findByPk(targetUserId);

    if (!sourceUser || !targetUser) {
      return res.status(404).json({ message: 'One or both users not found.' });
    }

    // 1. Transfer Orders
    await Order.update(
      { userId: targetUserId },
      { where: { userId: sourceUserId } }
    );

    // 2. Transfer Products/FastFood/Services (if source was a seller/vendor)
    await Product.update({ sellerId: targetUserId }, { where: { sellerId: sourceUserId } });
    await FastFood.update({ vendor: targetUserId }, { where: { vendor: sourceUserId } });
    // Note: Assuming Service model has userId
    // await Service.update({ userId: targetUserId }, { where: { userId: sourceUserId } });

    // 3. Transfer Wallet Balance
    // Assuming you have a Wallet model
    const { Wallet } = require('../models');
    if (Wallet) {
       const sourceWallet = await Wallet.findOne({ where: { userId: sourceUserId } });
       const targetWallet = await Wallet.findOne({ where: { userId: targetUserId } });
       
       if (sourceWallet && sourceWallet.balance > 0) {
          if (!targetWallet) {
             await Wallet.create({ userId: targetUserId, balance: sourceWallet.balance });
          } else {
             targetWallet.balance += sourceWallet.balance;
             await targetWallet.save();
          }
          sourceWallet.balance = 0;
          await sourceWallet.save();
       }
    }

    // Update user walletBalance directly if it's on User model
    if (sourceUser.walletBalance > 0) {
       targetUser.walletBalance = parseFloat(targetUser.walletBalance || 0) + parseFloat(sourceUser.walletBalance);
       sourceUser.walletBalance = 0;
    }

    // 4. Merge Roles
    let sourceRoles = Array.isArray(sourceUser.roles) ? sourceUser.roles : [];
    let targetRoles = Array.isArray(targetUser.roles) ? targetUser.roles : [];
    const mergedRoles = [...new Set([...targetRoles, ...sourceRoles])];
    
    // Determine main role
    let mainRole = targetUser.role;
    const rolePriority = ['superadmin', 'admin', 'logistics_manager', 'finance_manager', 'ops_manager', 'seller', 'marketer', 'delivery_agent', 'customer'];
    for (const role of rolePriority) {
        if (mergedRoles.includes(role)) {
            mainRole = role;
            break;
        }
    }

    targetUser.roles = mergedRoles;
    targetUser.role = mainRole;
    await targetUser.save();

    // 5. Soft Delete Source User & Free Up Email/Phone
    const timestamp = Date.now();
    sourceUser.email = `merged_${timestamp}_${sourceUser.email}`;
    sourceUser.phone = `merged_${timestamp}_${sourceUser.phone}`;
    sourceUser.isDeactivated = true;
    sourceUser.isFrozen = true;
    await sourceUser.save();
    
    // Sequelize paranoid soft delete
    await sourceUser.destroy();

    // 6. Log admin action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'MERGE_ACCOUNTS',
      targetType: 'User',
      targetId: targetUserId,
      targetName: targetUser.email || targetUser.phone,
      details: { message: `Merged user ${sourceUserId} into ${targetUserId}` },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Accounts merged successfully.' });
  } catch (error) {
    console.error('[AdminTools] Merge Accounts error:', error);
    res.status(500).json({ message: 'Internal server error during account merge.' });
  }
};

exports.impersonateUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate JWT token for this user
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    const payload = {
      id: user.id,
      userType: 'regular',
      role: user.role,
      tokenVersion: user.tokenVersion,
      impersonatedBy: req.user.id // Track who is impersonating
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1d' });

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'IMPERSONATE_USER',
      targetType: 'User',
      targetId: user.id,
      targetName: user.email || user.phone || user.name,
      details: { message: `Admin started impersonating user #${user.id}` },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
        message: 'Impersonation started successfully.', 
        token, 
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        } 
    });
  } catch (error) {
    console.error('[AdminTools] Impersonate User error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.walletAdjust = async (req, res) => {
  try {
    const { userId, amount, reason, type } = req.body; // type: 'credit' or 'debit'

    if (!userId || !amount || isNaN(amount) || amount <= 0 || !reason || !type) {
      return res.status(400).json({ message: 'User ID, valid amount, type (credit/debit), and reason are required.' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const adjustmentAmount = type === 'debit' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));

    // Update user walletBalance directly
    user.walletBalance = parseFloat(user.walletBalance || 0) + adjustmentAmount;
    
    if (user.walletBalance < 0) {
        return res.status(400).json({ message: 'Insufficient funds for this debit adjustment. Wallet cannot go below 0.' });
    }
    await user.save();

    // Also update Wallet model if it exists
    const { Wallet, Transaction } = require('../models');
    let wallet = null;
    if (Wallet) {
       wallet = await Wallet.findOne({ where: { userId: user.id } });
       if (!wallet) {
           wallet = await Wallet.create({ userId: user.id, balance: user.walletBalance });
       } else {
           wallet.balance = user.walletBalance;
           await wallet.save();
       }
    }

    // Record the transaction
    if (Transaction) {
        await Transaction.create({
            userId: user.id,
            walletId: wallet ? wallet.id : null,
            type: type === 'credit' ? 'CREDIT' : 'DEBIT',
            amount: Math.abs(adjustmentAmount),
            status: 'COMPLETED',
            reference: `MANUAL_ADJ_${Date.now()}`,
            description: `Admin Adjustment: ${reason}`,
            balanceAfter: user.walletBalance,
            paymentMethod: 'MANUAL_ADJUSTMENT'
        });
    }

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'WALLET_ADJUST',
      targetType: 'User',
      targetId: user.id,
      targetName: user.email || user.phone || user.name,
      details: { amount: adjustmentAmount, type, reason, newBalance: user.walletBalance },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: `Wallet ${type === 'credit' ? 'credited' : 'debited'} successfully.`, newBalance: user.walletBalance });
  } catch (error) {
    console.error('[AdminTools] Wallet Adjust error:', error);
    res.status(500).json({ message: 'Internal server error during wallet adjustment.' });
  }
};

exports.forceOrderStatus = async (req, res) => {
  try {
    const { orderId, newStatus, reason } = req.body;

    if (!orderId || !newStatus) {
      return res.status(400).json({ message: 'Order ID and new status are required.' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const oldStatus = order.status;
    order.status = newStatus;
    
    // Auto-update deliveredAt if status is delivered
    if (newStatus === 'delivered' && !order.deliveredAt) {
        order.deliveredAt = new Date();
    }
    
    await order.save();

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'FORCE_ORDER_STATUS',
      targetType: 'Order',
      targetId: order.id,
      targetName: `Order #${order.id}`,
      details: { oldStatus, newStatus, reason: reason || 'Manual Admin Override' },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: `Order #${order.id} status forcefully changed from ${oldStatus} to ${newStatus}.`, order });
  } catch (error) {
    console.error('[AdminTools] Force Order Status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { Order, User, OrderItem } = require('../models');
    const { Op } = require('sequelize');
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { checkoutOrderNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    const orders = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'phone', 'email'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'businessName'] }
      ]
    });

    res.json({
      success: true,
      orders: orders.rows,
      total: orders.count,
      pages: Math.ceil(orders.count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('[AdminTools] Get All Orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, adminId, targetType, targetId } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    const logs = await AdminAuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'admin', attributes: ['id', 'name', 'email', 'profileImage'] }
      ]
    });

    res.json({
      success: true,
      logs: logs.rows,
      total: logs.count,
      pages: Math.ceil(logs.count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('[AdminTools] Get Audit Logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    // 1. Get Login History
    const logins = await LoginHistory.findAll({
      where: { userId },
      limit: 20,
      order: [['createdAt', 'DESC']]
    });

    // 2. Get Admin Actions on this user
    const adminActions = await AdminAuditLog.findAll({
      where: {
        targetType: 'User',
        targetId: String(userId)
      },
      limit: 20,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'admin', attributes: ['id', 'name'] }
      ]
    });

    // 3. Get Orders by this user
    const orders = await Order.findAll({
      where: { userId },
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      logins,
      adminActions,
      orders
    });
  } catch (error) {
    console.error('[AdminTools] Get User Activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.reassignDeliveryAgent = async (req, res) => {
  try {
    const { orderId, newAgentId, newAgentIds, reason } = req.body;
    
    const agentIds = Array.isArray(newAgentIds) && newAgentIds.length > 0 
      ? newAgentIds 
      : (newAgentId ? [newAgentId] : []);

    if (!orderId || agentIds.length === 0) {
      return res.status(400).json({ message: 'Order ID and at least one New Agent ID are required.' });
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'businessName', 'phone'] }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const validAgentIds = [];
    const validAgents = [];
    for (const id of agentIds) {
      const agent = await User.findByPk(id);
      if (agent && (agent.role === 'delivery_agent' || (agent.roles || []).includes('delivery_agent'))) {
        validAgentIds.push(id);
        validAgents.push(agent);
      }
    }

    if (validAgentIds.length === 0) {
      return res.status(400).json({ message: 'None of the selected users are delivery agents.' });
    }

    const oldAgentId = order.deliveryAgentId;
    const oldStatus = order.status;

    // 1. Update Order
    if (validAgentIds.length === 1) {
      order.deliveryAgentId = validAgentIds[0];
    } else {
      order.deliveryAgentId = null;
    }
    // Reset status to awaiting_delivery_assignment or similar if it was accepted? 
    // Usually, we keep the status but update the task.
    await order.save();

    // 2. Manage DeliveryTasks
    // Deactivate/Cancel any existing active tasks for this order
    const { DeliveryTask } = require('../models');
    await DeliveryTask.update(
      { status: 'rejected', rejectionReason: `Reassigned by Admin: ${reason || 'No reason provided'}` },
      { 
        where: { 
          orderId: order.id, 
          status: ['assigned', 'accepted', 'arrived_at_pickup', 'in_progress'] 
        } 
      }
    );

    // Create new tasks for the new agents
    const createdTasks = [];
    for (const agentId of validAgentIds) {
      const newTask = await DeliveryTask.create({
        orderId: order.id,
        deliveryAgentId: agentId,
        status: 'assigned',
        assignedAt: new Date(),
        notes: reason || 'Manual Admin Reassignment (Broadcast)',
        deliveryType: order.deliveryType || 'seller_to_customer'
      });
      createdTasks.push(newTask);
    }

    // 3. Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'REASSIGN_DELIVERY_AGENT',
      targetType: 'Order',
      targetId: order.id,
      targetName: `Order #${order.id}`,
      details: { oldAgentId, newAgentIds: validAgentIds, reason: reason || 'Manual Admin Override' },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 4. Notifications
    const { createNotification } = require('../utils/notificationHelpers');
    
    // Notify new agents
    for (const agentId of validAgentIds) {
      await createNotification(
        agentId,
        'New Delivery Assignment',
        `You have been manually assigned to Order #${order.orderNumber}. Reason: Admin Reassignment.`,
        'info'
      );
    }

    // Notify old agent if existed
    if (oldAgentId && !validAgentIds.includes(oldAgentId)) {
      await createNotification(
        oldAgentId,
        'Order Unassigned',
        `Order #${order.orderNumber} has been unassigned from you by an administrator.`,
        'warning'
      );
    }

    // Realtime updates
    const { getIO } = require('../realtime/socket');
    const io = getIO();
    if (io) {
      for (const task of createdTasks) {
         io.to(`user:${task.deliveryAgentId}`).emit('deliveryTaskAssigned', { orderId: order.id, taskId: task.id });
      }
      if (oldAgentId && !validAgentIds.includes(oldAgentId)) {
        io.to(`user:${oldAgentId}`).emit('deliveryTaskRemoved', { orderId: order.id });
      }
      io.to('admin').emit('orderUpdate', { orderId: order.id, action: 'reassigned' });
    }

    res.json({ 
      message: `Order #${order.id} reassigned successfully to ${validAgentIds.length} agents.`, 
      order,
      newAgents: validAgents.map(a => ({ id: a.id, name: a.name }))
    });
  } catch (error) {
    console.error('[AdminTools] Reassign Delivery Agent error:', error);
    res.status(500).json({ message: 'Internal server error during reassignment.' });
  }
};

exports.issueRefund = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId || !amount || isNaN(amount) || amount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Order ID and valid amount are required.' });
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: User, as: 'user' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.userId) {
      await t.rollback();
      return res.status(400).json({ message: 'Cannot refund guest orders to wallet. Only registered users have wallets.' });
    }

    // Safety check: Don't refund more than the order total
    // (In a real app, we'd track totalRefundedAmount on the Order model)
    if (parseFloat(amount) > parseFloat(order.total)) {
      await t.rollback();
      return res.status(400).json({ message: `Refund amount (${amount}) exceeds order total (${order.total}).` });
    }

    const user = order.user;
    const refundAmount = parseFloat(amount);

    // 1. Update User walletBalance
    user.walletBalance = parseFloat(user.walletBalance || 0) + refundAmount;
    await user.save({ transaction: t });

    // 2. Update Wallet model
    const { Wallet, Transaction } = require('../models');
    let wallet = await Wallet.findOne({ where: { userId: user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!wallet) {
      wallet = await Wallet.create({ userId: user.id, balance: user.walletBalance }, { transaction: t });
    } else {
      wallet.balance = user.walletBalance;
      await wallet.save({ transaction: t });
    }

    // 3. Record Transaction
    await Transaction.create({
      userId: user.id,
      walletId: wallet.id,
      orderId: order.id,
      type: 'CREDIT',
      amount: refundAmount,
      status: 'COMPLETED',
      reference: `REFUND_${order.orderNumber}_${Date.now()}`,
      description: `Refund for Order #${order.orderNumber}: ${reason || 'Manual Admin Refund'}`,
      balanceAfter: user.walletBalance,
      paymentMethod: 'WALLET_REFUND'
    }, { transaction: t });

    // 4. Update Order Status (Optional, maybe mark as partially refunded or similar)
    // For now, let's just log it in order notes if we had a notes field.
    // Let's check if we have a notes field. We have adminRoutingNotes but that's for routing.
    // We can just keep the status as is or update to 'returned' if it's a full refund.
    if (refundAmount >= parseFloat(order.total)) {
        order.status = 'returned';
        await order.save({ transaction: t });
    }

    // 5. Log admin action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'ISSUE_REFUND',
      targetType: 'Order',
      targetId: order.id,
      targetName: `Order #${order.orderNumber}`,
      details: { amount: refundAmount, reason, userId: user.id, orderNumber: order.orderNumber },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    await t.commit();

    // 6. Notify user
    const { createNotification } = require('../utils/notificationHelpers');
    await createNotification(
      user.id,
      'Refund Issued',
      `A refund of KSh ${refundAmount.toLocaleString()} for Order #${order.orderNumber} has been credited to your wallet.`,
      'success'
    );

    res.json({ 
      message: `Refund of KSh ${refundAmount} issued successfully to ${user.name}'s wallet.`, 
      newBalance: user.walletBalance 
    });

  } catch (error) {
    if (t) await t.rollback();
    console.error('[AdminTools] Issue Refund error:', error);
    res.status(500).json({ message: 'Internal server error during refund.' });
  }
};

exports.getProductsBySeller = async (req, res) => {
  try {
    const { Product } = require('../models');
    const { sellerId } = req.params;
    const products = await Product.findAll({
      where: { sellerId },
      attributes: ['id', 'name', 'price', 'isActive', 'mainImage', 'coverImage', 'status'],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, products });
  } catch (error) {
    console.error('[AdminTools] Get Products By Seller error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getFastFoodByVendor = async (req, res) => {
  try {
    const { FastFood } = require('../models');
    const { vendorId } = req.params;
    const products = await FastFood.findAll({
      where: { vendor: vendorId },
      attributes: ['id', 'name', 'basePrice', 'isActive', 'coverImage', 'mainImage'],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, products });
  } catch (error) {
    console.error('[AdminTools] Get FastFood By Vendor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.forceShopStatus = async (req, res) => {
  try {
    const { sellerId, status } = req.body; // status: 'OPEN', 'CLOSED', 'AUTO'
    
    if (!sellerId || !['OPEN', 'CLOSED', 'AUTO'].includes(status)) {
        return res.status(400).json({ message: 'Seller ID and valid status (OPEN, CLOSED, AUTO) are required.' });
    }

    const seller = await User.findByPk(sellerId);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    const { FastFood } = require('../models');
    const [count] = await FastFood.update(
        { availabilityMode: status },
        { where: { vendor: sellerId } }
    );

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'FORCE_SHOP_STATUS',
      targetType: 'User',
      targetId: sellerId,
      targetName: seller.businessName || seller.name,
      details: { status, itemsUpdated: count },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      message: `Shop status for "${seller.businessName || seller.name}" forced to ${status}. ${count} items updated.`,
      sellerId,
      status,
      itemsUpdated: count
    });
  } catch (error) {
    console.error('[AdminTools] Force Shop Status error:', error);
    res.status(500).json({ message: 'Internal server error during shop status override.' });
  }
};

exports.generateCustomOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store it in the phoneOtp field (can be used for both email and phone in this context)
    user.phoneOtp = otp;
    user.phoneOtpExpiresAt = expiresAt;
    await user.save();

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'GENERATE_CUSTOM_OTP',
      targetType: 'User',
      targetId: user.id,
      targetName: user.email || user.phone || user.name,
      details: { message: `Generated custom OTP for user #${user.id}` },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      message: 'Custom OTP generated successfully.', 
      otp, 
      expiresAt,
      userId: user.id 
    });
  } catch (error) {
    console.error('[AdminTools] Generate Custom OTP error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.bulkToggleItems = async (req, res) => {
  try {
    const { itemIds, isActive, type } = req.body; // type: 'product' or 'fastfood'

    if (!Array.isArray(itemIds) || itemIds.length === 0 || isActive === undefined || !type) {
      return res.status(400).json({ message: 'Item IDs (array), isActive (boolean), and type are required.' });
    }

    const { Product, FastFood } = require('../models');
    let count = 0;

    if (type === 'product') {
      [count] = await Product.update(
        { isActive: !!isActive },
        { where: { id: itemIds } }
      );
    } else if (type === 'fastfood') {
      [count] = await FastFood.update(
        { isActive: !!isActive },
        { where: { id: itemIds } }
      );
    } else {
      return res.status(400).json({ message: 'Invalid item type. Use "product" or "fastfood".' });
    }

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'BULK_TOGGLE_ITEMS',
      targetType: type === 'product' ? 'Product' : 'FastFood',
      targetId: 0, // Multiple items
      targetName: `Bulk ${isActive ? 'Activation' : 'Deactivation'}`,
      details: { itemIds, isActive, type, count },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      message: `Successfully ${isActive ? 'activated' : 'deactivated'} ${count} ${type} items.`, 
      count,
      type
    });
  } catch (error) {
    console.error('[AdminTools] Bulk Toggle Items error:', error);
    res.status(500).json({ message: 'Internal server error during bulk toggle.' });
  }
};

exports.cloneOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { originalOrderId } = req.body;
    if (!originalOrderId) return res.status(400).json({ message: 'Original Order ID is required' });

    const originalOrder = await Order.findByPk(originalOrderId, {
      include: [{ model: OrderItem }]
    });

    if (!originalOrder) {
      await t.rollback();
      return res.status(404).json({ message: 'Original order not found' });
    }

    const gen = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 999)}`;
    const newOrderNumber = gen();

    // Clone order data
    const newOrderData = {
      ...originalOrder.get({ plain: true }),
      id: undefined,
      orderNumber: newOrderNumber,
      checkoutOrderNumber: newOrderNumber,
      checkoutGroupId: `GRP-CLONE-${Date.now()}`,
      status: 'order_placed',
      paymentConfirmed: false,
      sellerConfirmed: false,
      sellerHandoverConfirmed: false,
      superAdminConfirmed: false,
      superAdminConfirmedAt: null,
      superAdminConfirmedBy: null,
      deliveryAgentId: null,
      trackingNumber: `TRK-CLONE-${Date.now()}`,
      trackingUpdates: JSON.stringify([{
        status: 'order_placed',
        message: `Order cloned from #${originalOrder.orderNumber}`,
        timestamp: new Date().toISOString(),
        updatedBy: req.user.id
      }]),
      createdAt: undefined,
      updatedAt: undefined
    };

    const newOrder = await Order.create(newOrderData, { transaction: t });

    // Clone items
    const newItems = originalOrder.OrderItems.map(item => ({
      ...item.get({ plain: true }),
      id: undefined,
      orderId: newOrder.id,
      createdAt: undefined,
      updatedAt: undefined
    }));

    await OrderItem.bulkCreate(newItems, { transaction: t });

    await t.commit();

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'CLONE_ORDER',
      targetType: 'Order',
      targetId: newOrder.id,
      targetName: newOrder.orderNumber,
      details: { originalOrderId, originalOrderNumber: originalOrder.orderNumber },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      message: `Order cloned successfully as #${newOrder.orderNumber}`, 
      newOrderId: newOrder.id,
      newOrderNumber: newOrder.orderNumber 
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('[AdminTools] Clone Order error:', error);
    res.status(500).json({ message: 'Internal server error during order cloning.' });
  }
};

exports.resendOrderNotification = async (req, res) => {
  try {
    const { orderId, type } = req.body; // type: 'placed', 'confirmed', 'shipped', 'cancelled'
    
    if (!orderId || !type) {
      return res.status(400).json({ message: 'Order ID and Notification Type are required.' });
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user' },
        { model: User, as: 'seller' },
        { model: User, as: 'deliveryAgent' }
      ]
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const notificationHelpers = require('../utils/notificationHelpers');
    let sent = false;

    switch (type) {
      case 'placed':
        // Fetch full order with items for the notification
        const fullOrder = await Order.findByPk(orderId, {
          include: [{ model: OrderItem, as: 'OrderItems' }]
        });
        const items = fullOrder.OrderItems || [];
        const itemsList = items.map(i => `* ${i.name} x${i.quantity} - KES ${(Number(i.price) * i.quantity).toLocaleString()}`).join('\n');
        
        await notificationHelpers.notifyCustomerOrderPlaced(fullOrder, order.user, items.length, itemsList);
        sent = true;
        break;
      case 'confirmed':
        await notificationHelpers.notifyCustomerSellerConfirmed(order, order.seller);
        sent = true;
        break;
      case 'shipped':
        if (order.deliveryAgent) {
          await notificationHelpers.notifyCustomerOutForDelivery(order, order.deliveryAgent);
          sent = true;
        } else {
          return res.status(400).json({ message: 'No delivery agent assigned to this order yet.' });
        }
        break;
      case 'cancelled':
        await notificationHelpers.notifyCustomerOrderCancelled(order, 'Resent notification for your cancellation.');
        sent = true;
        break;
      default:
        return res.status(400).json({ message: 'Invalid notification type.' });
    }

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'RESEND_NOTIFICATION',
      targetType: 'Order',
      targetId: order.id,
      targetName: order.orderNumber,
      details: { type },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: `Successfully resent "${type}" notification for Order #${order.orderNumber}.` });
  } catch (error) {
    console.error('[AdminTools] Resend Notification error:', error);
    res.status(500).json({ message: 'Internal server error during notification resend.' });
  }
};

exports.broadcastMessage = async (req, res) => {
  try {
    const { targetRole, message, title, channels } = req.body; // targetRole: 'all', 'seller', 'marketer', etc.
    
    if (!targetRole || !message || !channels || !Array.isArray(channels)) {
      return res.status(400).json({ message: 'Target role, message, and channels (array) are required.' });
    }

    const where = {};
    if (targetRole !== 'all') {
      where.role = targetRole;
    }

    const users = await User.findAll({ 
      where, 
      attributes: ['id', 'name', 'email', 'phone', 'role'] 
    });

    if (users.length === 0) return res.status(404).json({ message: 'No users found for the selected target.' });

    const notificationHelpers = require('../utils/notificationHelpers');
    
    // We send in chunks of 20 to avoid overwhelming the system
    const chunkSize = 20;
    let successCount = 0;
    
    for (let i = 0; i < users.length; i += chunkSize) {
      const chunk = users.slice(i, i + chunkSize);
      await Promise.allSettled(chunk.map(user => 
        notificationHelpers.sendCustomerNotificationAcrossChannels('broadcast', {
          name: user.name,
          message,
          title: title || 'Broadcast Announcement',
          defaultTemplate: message
        }, user, null)
      ));
      successCount += chunk.length;
    }

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'BROADCAST_MESSAGE',
      targetType: 'System',
      targetId: 0,
      targetName: `Broadcast to ${targetRole}`,
      details: { targetRole, userCount: users.length, channels, title },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      message: `Broadcast initiated to ${users.length} users.`, 
      userCount: users.length 
    });
  } catch (error) {
    console.error('[AdminTools] Broadcast error:', error);
    res.status(500).json({ message: 'Internal server error during broadcast.' });
  }
};

exports.runDatabaseCleanup = async (req, res) => {
  try {
    const { target } = req.body; // otp, logs, soft_deleted
    
    if (!target) return res.status(400).json({ message: 'Cleanup target is required.' });

    const { Otp, Product, FastFood, AdminAuditLog } = require('../models');
    const { Op } = require('sequelize');
    let count = 0;

    switch (target) {
      case 'otp':
        // Delete OTPs older than 24 hours
        count = await Otp.destroy({
          where: {
            createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        });
        break;
      case 'logs':
        // Delete debug/diagnostic logs older than 7 days (not audit logs)
        // For now, let's just do a placeholder or clear the diagnostic file
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../notification_debug.log');
        if (fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, '');
            count = 'Log file cleared';
        }
        break;
      case 'soft_deleted':
        // Permanently delete items soft-deleted more than 30 days ago
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const pCount = await Product.destroy({
          where: {
            deletedAt: { [Op.lt]: thirtyDaysAgo }
          },
          force: true
        });
        const fCount = await FastFood.destroy({
          where: {
            deletedAt: { [Op.lt]: thirtyDaysAgo }
          },
          force: true
        });
        count = pCount + fCount;
        break;
      default:
        return res.status(400).json({ message: 'Invalid cleanup target.' });
    }

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'DATABASE_CLEANUP',
      targetType: 'System',
      targetId: 0,
      targetName: `Cleanup: ${target}`,
      details: { target, itemsRemoved: count },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: `Cleanup for "${target}" completed successfully.`, itemsRemoved: count });
  } catch (error) {
    console.error('[AdminTools] Cleanup error:', error);
    res.status(500).json({ message: 'Internal server error during database cleanup.' });
  }
};

exports.searchPayments = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: 'Search query is required.' });

    const { Payment, User, Order } = require('../models');
    const { Op } = require('sequelize');

    const payments = await Payment.findAll({
      where: {
        [Op.or]: [
          { mpesaReceiptNumber: { [Op.like]: `%${query}%` } },
          { mpesaTransactionId: { [Op.like]: `%${query}%` } },
          { mpesaPhoneNumber: { [Op.like]: `%${query}%` } },
          { transactionId: { [Op.like]: `%${query}%` } },
          { checkoutGroupId: { [Op.like]: `%${query}%` } }
        ]
      },
      include: [
        { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
        { model: Order, as: 'order', attributes: ['orderNumber', 'status'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({ payments });
  } catch (error) {
    console.error('[AdminTools] Search Payments error:', error);
    res.status(500).json({ message: 'Internal server error during payment search.' });
  }
};

exports.getBlockedIPs = async (req, res) => {
  try {
    const { BlockedIP, User } = require('../models');
    const list = await BlockedIP.findAll({
      include: [{ model: User, as: 'admin', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, list, ips: list });
  } catch (error) {
    console.error('[AdminTools] Get Blocked IPs error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.blockIP = async (req, res) => {
  try {
    const { ipAddress, reason, expiresAt } = req.body;
    if (!ipAddress) return res.status(400).json({ message: 'IP Address is required.' });

    const { BlockedIP } = require('../models');
    
    const [blocked, created] = await BlockedIP.findOrCreate({
      where: { ipAddress },
      defaults: {
        reason,
        expiresAt,
        blockedBy: req.user.id
      }
    });

    if (!created) {
      return res.status(400).json({ message: 'IP address is already blocked.' });
    }

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'BLOCK_IP',
      targetType: 'System',
      targetId: blocked.id,
      targetName: ipAddress,
      details: { reason, expiresAt },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: `IP Address ${ipAddress} has been blocked.` });
  } catch (error) {
    console.error('[AdminTools] Block IP error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.unblockIP = async (req, res) => {
  try {
    const { id } = req.params;
    const { BlockedIP } = require('../models');
    
    const blocked = await BlockedIP.findByPk(id);
    if (!blocked) return res.status(404).json({ message: 'Block record not found.' });

    const ipAddress = blocked.ipAddress;
    await blocked.destroy();

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'UNBLOCK_IP',
      targetType: 'System',
      targetId: id,
      targetName: ipAddress,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: `IP Address ${ipAddress} has been unblocked.` });
  } catch (error) {
    console.error('[AdminTools] Unblock IP error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.getAdvancedAnalytics = async (req, res) => {
  try {
    const { Order, User, DeliveryTask, sequelize } = require('../models');
    const { Op } = require('sequelize');

    // 1. Churn Analytics (Users who ordered before but not in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const churnedUsers = await User.findAll({
      where: {
        role: 'customer',
        lastLoginAt: { [Op.lt]: thirtyDaysAgo } // Fallback if no orders
      },
      attributes: ['id', 'name', 'email', 'phone', 'lastLoginAt'],
      limit: 50
    });

    // 2. Delivery Performance (Avg time from 'assigned' to 'delivered')
    const deliveryStats = await Order.findAll({
      where: {
        status: 'delivered',
        updatedAt: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.literal('DATEDIFF(updatedAt, createdAt)')), 'avgDaysToDeliver'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalDelivered']
      ],
      raw: true
    });

    // 3. Late Orders (Orders taking more than 2 hours - simplified for now)
    const lateOrders = await Order.count({
      where: {
        status: { [Op.notIn]: ['delivered', 'cancelled'] },
        createdAt: { [Op.lt]: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      }
    });

    res.json({
      churn: {
        count: churnedUsers.length,
        sample: churnedUsers
      },
      delivery: {
        avgDays: parseFloat(deliveryStats[0]?.avgDaysToDeliver || 0).toFixed(2),
        total: deliveryStats[0]?.totalDelivered || 0,
        lateCount: lateOrders
      }
    });
  } catch (error) {
    console.error('[AdminTools] Advanced Analytics error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { LoginHistory } = require('../models');
    
    const sessions = await LoginHistory.findAll({
      where: { userId, status: 'success' },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({ sessions });
  } catch (error) {
    console.error('[AdminTools] Get User Sessions error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.forceLogoutUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });

    const { User } = require('../models');
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Increment token version to invalidate all current JWTs
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'FORCE_LOGOUT',
      targetType: 'User',
      targetId: userId,
      targetName: user.name,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: `All sessions for ${user.name} have been invalidated.` });
  } catch (error) {
    console.error('[AdminTools] Force Logout error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.getNotificationTemplates = async (req, res) => {
  try {
    const { PlatformConfig } = require('../models');
    let config = await PlatformConfig.findOne({ where: { key: 'notification_templates' } });
    
    if (!config) {
      // Initialize default templates if missing
      const defaults = {
        orderPlaced: "Hello {name}, your order #{orderNumber} has been placed successfully! 🛍️",
        sellerConfirmed: "Hello {name}, your order #{orderNumber} has been confirmed by {sellerName}.",
        orderInTransit: "Your order #{orderNumber} is on its way! Collected by {agentName}.",
        orderCancelled: "Hello {name}, order #{orderNumber} has been cancelled. Reason: {reason}"
      };
      config = await PlatformConfig.create({
        key: 'notification_templates',
        value: JSON.stringify(defaults)
      });
    }

    res.json({ templates: JSON.parse(config.value) });
  } catch (error) {
    console.error('[AdminTools] Get Templates error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.updateNotificationTemplate = async (req, res) => {
  try {
    const { key, message } = req.body;
    if (!key || !message) return res.status(400).json({ message: 'Template key and message are required.' });

    const { PlatformConfig } = require('../models');
    let config = await PlatformConfig.findOne({ where: { key: 'notification_templates' } });
    
    let templates = config ? JSON.parse(config.value) : {};
    templates[key] = message;

    if (config) {
      config.value = JSON.stringify(templates);
      await config.save();
    } else {
      await PlatformConfig.create({
        key: 'notification_templates',
        value: JSON.stringify(templates)
      });
    }

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'UPDATE_TEMPLATE',
      targetType: 'Config',
      targetId: 0,
      targetName: `Template: ${key}`,
      details: { key, message },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: `Template "${key}" updated successfully.` });
  } catch (error) {
    console.error('[AdminTools] Update Template error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
