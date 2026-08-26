const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const { Order, Subscription, Plan, User } = require('../database/models.registry');
const { Op } = require('sequelize');

// Get pending payment verifications
router.get('/pending-verification', auth, adminOnly, async (req, res) => {
  try {
    const pendingOrders = await Order.findAll({
      where: {
        paymentType: 'prepay',
        needsPaymentVerification: true,
        paymentVerificationStatus: {
          [Op.or]: [null, 'pending']
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: Plan,
              as: 'plan',
              attributes: ['id', 'name', 'description']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    const formattedOrders = pendingOrders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      subscriptionId: order.subscriptionId,
      amount: order.total,
      paymentSubType: order.paymentSubType,
      paymentProofUrl: order.paymentProofUrl,
      createdAt: order.createdAt,
      customerInfo: order.guestData || null,
      user: order.user,
      planName: order.subscription?.plan?.name || 'Unknown Plan',
      planDescription: order.subscription?.plan?.description || ''
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// Approve payment
router.post('/approve', auth, adminOnly, async (req, res) => {
  try {
    const { orderId, subscriptionId } = req.body;

    // Update order status
    await Order.update({
      paymentVerificationStatus: 'approved',
      paymentVerifiedAt: new Date(),
      paymentVerifiedBy: req.user.id
    }, {
      where: { id: orderId }
    });

    // Activate subscription
    await Subscription.update({
      status: 'Active',
      activatedAt: new Date()
    }, {
      where: { id: subscriptionId }
    });

    // Get subscription details for notification
    const subscription = await Subscription.findByPk(subscriptionId, {
      include: [
        {
          model: Plan,
          as: 'plan'
        },
        {
          model: User,
          as: 'user'
        }
      ]
    });

    const order = await Order.findByPk(orderId);

    // Send notification to user (you can implement your notification system here)
    try {
      // If it's a guest user
      if (order.guestData && order.guestData.email) {
        // Send email notification to guest
        console.log(`📧 Sending approval notification to guest: ${order.guestData.email}`);
        // TODO: Implement email service
      } else if (subscription.user) {
        // Send notification to registered user
        console.log(`📧 Sending approval notification to user: ${subscription.user.email}`);
        // TODO: Implement user notification system
      }
    } catch (notificationError) {
      console.error('Failed to send approval notification:', notificationError);
    }

    res.json({ 
      success: true, 
      message: 'Payment approved and subscription activated',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planName: subscription.plan?.name
      }
    });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

// Reject payment
router.post('/reject', auth, adminOnly, async (req, res) => {
  try {
    const { orderId, subscriptionId, reason } = req.body;

    // Update order status
    await Order.update({
      paymentVerificationStatus: 'rejected',
      paymentRejectionReason: reason,
      paymentVerifiedAt: new Date(),
      paymentVerifiedBy: req.user.id
    }, {
      where: { id: orderId }
    });

    // Cancel subscription
    await Subscription.update({
      status: 'Cancelled',
      cancelledAt: new Date(),
      cancellationReason: `Payment rejected: ${reason}`
    }, {
      where: { id: subscriptionId }
    });

    // Get subscription details for notification
    const subscription = await Subscription.findByPk(subscriptionId, {
      include: [
        {
          model: Plan,
          as: 'plan'
        },
        {
          model: User,
          as: 'user'
        }
      ]
    });

    const order = await Order.findByPk(orderId);

    // Send rejection notification to user
    try {
      if (order.guestData && order.guestData.email) {
        console.log(`📧 Sending rejection notification to guest: ${order.guestData.email}`);
        // TODO: Implement email service with rejection reason
      } else if (subscription.user) {
        console.log(`📧 Sending rejection notification to user: ${subscription.user.email}`);
        // TODO: Implement user notification system with rejection reason
      }
    } catch (notificationError) {
      console.error('Failed to send rejection notification:', notificationError);
    }

    res.json({ 
      success: true, 
      message: 'Payment rejected and user notified',
      reason
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

// Send admin notification about new payment submission
router.post('/notify-admin', auth, async (req, res) => {
  try {
    const { orderId, subscriptionId, amount, paymentMethod, customerInfo } = req.body;

    // Here you would implement your admin notification system
    // This could be:
    // 1. Real-time notification via WebSocket
    // 2. Email to admin
    // 3. SMS to admin
    // 4. Push notification
    // 5. Slack/Teams notification

    console.log('🔔 New payment verification needed:', {
      orderId,
      subscriptionId,
      amount,
      paymentMethod,
      customerInfo
    });

    // TODO: Implement your preferred admin notification method
    // Examples:
    // await sendEmailToAdmin(orderDetails);
    // await sendSlackNotification(orderDetails);
    // await createInAppNotification(orderDetails);

    res.json({ success: true, message: 'Admin notified' });
  } catch (error) {
    console.error('Error notifying admin:', error);
    res.status(500).json({ error: 'Failed to notify admin' });
  }
});

module.exports = router;