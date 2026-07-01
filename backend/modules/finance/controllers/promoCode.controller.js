const { PromoCode, Order } = require('../../../database/models.registry');

// Apply a promo code
exports.applyPromoCode = async (req, res) => {
  try {
    const { code, orderType } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Promo code is required.' });
    }

    const promo = await PromoCode.findOne({ where: { code } });

    if (!promo) {
      return res.status(404).json({ success: false, message: 'Invalid promo code.' });
    }

    if (!promo.isActive) {
      return res.status(400).json({ success: false, message: 'Promo code is inactive.' });
    }

    if (promo.orderType !== 'all' && promo.orderType !== orderType) {
      return res.status(400).json({ success: false, message: `This promo code is only valid for ${promo.orderType} orders.` });
    }

    const now = new Date();
    if (promo.validFrom && new Date(promo.validFrom) > now) {
      return res.status(400).json({ success: false, message: 'Promo code is not yet valid.' });
    }
    if (promo.validUntil && new Date(promo.validUntil) < now) {
      return res.status(400).json({ success: false, message: 'Promo code has expired.' });
    }
    if (promo.maxUsageLimit && promo.usageCount >= promo.maxUsageLimit) {
      return res.status(400).json({ success: false, message: 'Promo code usage limit reached.' });
    }

    if (promo.targetAudience === 'new_users') {
      const customerPhone = req.body.phone || req.body.customerPhone;
      const customerEmail = req.body.email || req.body.customerEmail;
      
      if (req.user) {
        const orderCount = await Order.count({ where: { userId: req.user.id } });
        if (orderCount > 0) {
          return res.status(400).json({ success: false, message: 'This promo code is only valid for new users.' });
        }
      } else {
        let hasPreviousOrders = false;
        if (customerPhone) {
          const { normalizeKenyanPhone } = require('../../../middleware/validators');
          try {
            const phone = normalizeKenyanPhone(customerPhone);
            const orderCount = await Order.count({ where: { customerPhone: phone } });
            if (orderCount > 0) hasPreviousOrders = true;
          } catch(e) {}
        }
        if (!hasPreviousOrders && customerEmail) {
          const orderCount = await Order.count({ where: { customerEmail: customerEmail.toLowerCase() } });
          if (orderCount > 0) hasPreviousOrders = true;
        }

        if (hasPreviousOrders) {
           return res.status(400).json({ success: false, message: 'This promo code is only valid for new users. This contact info has been used before.' });
        }
      }
    }

    if (promo.minUserOrderCount > 0 || promo.minUserLifetimeSpend > 0) {
      const { Op } = require('sequelize');
      let validOrderCount = 0;
      let lifetimeSpend = 0;
      const validStatuses = ['delivered', 'completed'];
      
      const customerPhone = req.body.phone || req.body.customerPhone;
      const customerEmail = req.body.email || req.body.customerEmail;
      
      let whereClause = null;

      if (req.user) {
        whereClause = { userId: req.user.id, status: { [Op.in]: validStatuses } };
      } else {
        const orConditions = [];
        if (customerPhone) {
          const { normalizeKenyanPhone } = require('../../../middleware/validators');
          try {
            const phone = normalizeKenyanPhone(customerPhone);
            orConditions.push({ customerPhone: phone });
          } catch(e) {}
        }
        if (customerEmail) {
          orConditions.push({ customerEmail: customerEmail.toLowerCase() });
        }
        if (orConditions.length > 0) {
          whereClause = { [Op.or]: orConditions, status: { [Op.in]: validStatuses } };
        }
      }

      if (whereClause) {
        validOrderCount = await Order.count({ where: whereClause });
        lifetimeSpend = await Order.sum('total', { where: whereClause }) || 0;
      }

      if (promo.minUserOrderCount > 0 && validOrderCount < promo.minUserOrderCount) {
        return res.status(400).json({ success: false, message: `This promo code requires a minimum of ${promo.minUserOrderCount} previous valid orders.` });
      }
      
      if (promo.minUserLifetimeSpend > 0 && lifetimeSpend < promo.minUserLifetimeSpend) {
        return res.status(400).json({ success: false, message: `This promo code requires a lifetime spend of at least KES ${promo.minUserLifetimeSpend}.` });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        code: promo.code,
        discountPercentage: promo.discountPercentage,
        autoApply: promo.autoApply,
        orderType: promo.orderType,
        applicableProductIds: promo.applicableProductIds,
        minOrderValue: promo.minOrderValue,
        maxDiscountAmount: promo.maxDiscountAmount
      },
      message: 'Promo code applied successfully.'
    });

  } catch (error) {
    console.error('Error applying promo code:', error);
    res.status(500).json({ success: false, message: 'Server error applying promo code.' });
  }
};

// Get auto-apply promo code for order type
exports.getAutoApplyPromo = async (req, res) => {
  try {
    const { orderType } = req.query;

    const { Op } = require('sequelize');
    const now = new Date();
    
    const whereClause = {
      isActive: true,
      autoApply: true,
      [Op.and]: [
        {
          [Op.or]: [
            { validFrom: null },
            { validFrom: { [Op.lte]: now } }
          ]
        },
        {
          [Op.or]: [
            { validUntil: null },
            { validUntil: { [Op.gte]: now } }
          ]
        },
        {
          [Op.or]: [
            { maxUsageLimit: null },
            { usageCount: { [Op.lt]: require('sequelize').col('maxUsageLimit') } }
          ]
        }
      ]
    };
    
    // We can fetch one that matches 'all' or specific orderType
    if (orderType) {
       whereClause.orderType = { [Op.in]: ['all', orderType] };
    }

    const promo = await PromoCode.findOne({ 
      where: whereClause,
      order: [['discountPercentage', 'DESC']] // get the best one
    });

    if (!promo) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({
      success: true,
      data: {
        code: promo.code,
        discountPercentage: promo.discountPercentage,
        autoApply: promo.autoApply,
        orderType: promo.orderType,
        applicableProductIds: promo.applicableProductIds,
        minOrderValue: promo.minOrderValue,
        maxDiscountAmount: promo.maxDiscountAmount
      }
    });
  } catch (error) {
    console.error('Error fetching auto-apply promo code:', error);
    res.status(500).json({ success: false, message: 'Server error fetching promo code.' });
  }
};

// Admin: Get all promo codes
exports.getAllPromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, data: promoCodes });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ success: false, message: 'Error fetching promo codes.' });
  }
};

// Admin: Create promo code
exports.createPromoCode = async (req, res) => {
  try {
    const { 
      code, discountPercentage, isActive, autoApply = false, orderType = 'all',
      validFrom, validUntil, targetAudience, applicableProductIds, minOrderValue, maxDiscountAmount, maxUsageLimit,
      minUserOrderCount, minUserLifetimeSpend
    } = req.body;
    console.log('--- CREATE PROMO DEBUG ---');
    console.log('Req Body:', req.body);

    if (!code || isNaN(discountPercentage)) {
      return res.status(400).json({ success: false, message: 'Valid code and discount percentage are required.' });
    }

    const existingCode = await PromoCode.findOne({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ success: false, message: 'Promo code already exists.' });
    }

    const promoCode = await PromoCode.create({
      code,
      discountPercentage,
      isActive: isActive !== undefined ? isActive : true,
      autoApply,
      orderType,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      targetAudience: targetAudience || 'all',
      applicableProductIds: applicableProductIds && typeof applicableProductIds === 'string' ? applicableProductIds.split(',').map(id => id.trim()).filter(id => id) : (applicableProductIds || null),
      minOrderValue: minOrderValue || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      maxUsageLimit: maxUsageLimit || null,
      minUserOrderCount: minUserOrderCount || null,
      minUserLifetimeSpend: minUserLifetimeSpend || null,
      createdBy: req.user.id
    });
    console.log('Saved Promo:', promoCode.toJSON());

    res.status(201).json({ success: true, data: promoCode, message: 'Promo code created successfully.' });
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({ success: false, message: 'Error creating promo code.' });
  }
};

// Admin: Update promo code
exports.updatePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      code, discountPercentage, isActive, autoApply, orderType,
      validFrom, validUntil, targetAudience, applicableProductIds, minOrderValue, maxDiscountAmount, maxUsageLimit,
      minUserOrderCount, minUserLifetimeSpend
    } = req.body;
    console.log('--- UPDATE PROMO DEBUG ---');
    console.log('Req Body:', req.body);

    const promoCode = await PromoCode.findByPk(id);

    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }

    await promoCode.update({
      code: code || promoCode.code,
      discountPercentage: discountPercentage !== undefined ? discountPercentage : promoCode.discountPercentage,
      isActive: isActive !== undefined ? isActive : promoCode.isActive,
      autoApply: autoApply !== undefined ? autoApply : promoCode.autoApply,
      orderType: orderType !== undefined ? orderType : promoCode.orderType,
      validFrom: validFrom !== undefined ? validFrom : promoCode.validFrom,
      validUntil: validUntil !== undefined ? validUntil : promoCode.validUntil,
      targetAudience: targetAudience !== undefined ? targetAudience : promoCode.targetAudience,
      applicableProductIds: applicableProductIds !== undefined ? (typeof applicableProductIds === 'string' ? applicableProductIds.split(',').map(id => id.trim()).filter(id => id) : applicableProductIds) : promoCode.applicableProductIds,
      minOrderValue: minOrderValue !== undefined ? minOrderValue : promoCode.minOrderValue,
      maxDiscountAmount: maxDiscountAmount !== undefined ? maxDiscountAmount : promoCode.maxDiscountAmount,
      maxUsageLimit: maxUsageLimit !== undefined ? maxUsageLimit : promoCode.maxUsageLimit,
      minUserOrderCount: minUserOrderCount !== undefined ? minUserOrderCount : promoCode.minUserOrderCount,
      minUserLifetimeSpend: minUserLifetimeSpend !== undefined ? minUserLifetimeSpend : promoCode.minUserLifetimeSpend
    });
    console.log('Updated Promo:', promoCode.toJSON());

    res.status(200).json({ success: true, data: promoCode, message: 'Promo code updated successfully.' });
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({ success: false, message: 'Error updating promo code.' });
  }
};

// Admin: Delete promo code
exports.deletePromoCode = async (req, res) => {
  try {
    const { id } = req.params;

    const promoCode = await PromoCode.findByPk(id);

    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }

    await promoCode.destroy();

    res.status(200).json({ success: true, message: 'Promo code deleted successfully.' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ success: false, message: 'Error deleting promo code.' });
  }
};
