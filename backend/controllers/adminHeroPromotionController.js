const { Op } = require('sequelize');
const { HeroPromotion, Product, User, Notification, PlatformConfig, FastFood } = require('../models/index');
const cacheService = require('../scripts/services/cacheService');

// Pricing config
const getRateConfig = async () => {
  const rows = await PlatformConfig.findAll({ where: { key: { [Op.in]: ['HERO_RATE_PER_DAY', 'HERO_RATE_PER_PRODUCT'] } }, raw: true })
  const map = new Map(rows.map(r => [r.key, parseFloat(r.value)]))
  const perDay = Number.isFinite(map.get('HERO_RATE_PER_DAY')) ? map.get('HERO_RATE_PER_DAY') : 500
  const perProduct = Number.isFinite(map.get('HERO_RATE_PER_PRODUCT')) ? map.get('HERO_RATE_PER_PRODUCT') : 100
  return { perDay, perProduct }
}

// Admin: refund a paid hero promotion application (typically after seller requested refund)
const refundHeroPromotion = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { reason } = req.body || {}
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (item.paymentStatus !== 'paid' && item.paymentStatus !== 'refund_requested') {
      return res.status(400).json({ error: 'Only paid or refund-requested applications can be refunded' })
    }

    item.paymentStatus = 'refunded'
    // Ensure it will not go live
    if (!['cancelled', 'rejected', 'expired'].includes(item.status)) item.status = 'cancelled'
    if (reason) item.notes = [item.notes, `Refund: ${reason}`].filter(Boolean).join('\n')
    await item.save()

    // Invalidate homepage cache
    await cacheService.delPattern('homepage:*');

    // Notify seller
    try {
      await Notification.create({
        userId: item.sellerId,
        title: 'Hero Promotion Refunded',
        message: `Your hero promotion (ID ${item.id}) has been refunded. Amount: KES ${item.amount}. ${reason ? 'Reason: ' + reason : ''}`
      })
    } catch { }

    // Optionally notify admin (current user)
    try {
      const adminId = req.user?.id || req.user?.userId
      if (adminId) await Notification.create({ userId: adminId, title: 'Refund Processed', message: `You refunded hero promotion ID ${item.id} (seller ${item.sellerId}).` })
    } catch { }

    res.json({ ok: true, item })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// Create hero promotion (admin)
const createHeroPromotion = async (req, res) => {
  try {
    const {
      sellerId,
      productIds = [],
      durationDays = 7,
      slotsCount = 1,
      startAt,
      free,
      title,
      subtitle,
      customImageUrl,
      targetUrl,
      isDefault,
      isSystem
    } = req.body || {}

    const effectiveIsSystem = !!(isSystem || !sellerId);

    if (!effectiveIsSystem && !sellerId) {
      return res.status(400).json({ error: 'sellerId required for non-system promotions' })
    }

    if (!customImageUrl && (!Array.isArray(productIds) || productIds.length === 0)) {
      return res.status(400).json({ error: 'Either customImageUrl or productIds required' })
    }

    // verify products belong to seller and approved
    if (productIds.length > 0 && sellerId) {
      // Admin can feature any seller product — only verify ownership, not approval status
      const prods = await Product.findAll({
        where: { id: { [Op.in]: productIds }, sellerId },
        attributes: ['id']
      })
      if (prods.length !== productIds.length) {
        return res.status(400).json({ error: 'One or more products do not belong to this seller' })
      }
    }

    const { perDay, perProduct } = await getRateConfig()
    const amount = (effectiveIsSystem || free) ? 0 : (Number(durationDays) || 0) * (perDay + (productIds.length * perProduct))

    const start = startAt ? new Date(startAt) : new Date()
    const days = Number(durationDays) || 7
    const end = new Date(start)
    end.setDate(end.getDate() + days)

    const payload = {
      sellerId: sellerId ? Number(sellerId) : null,
      productIds: Array.isArray(productIds) ? productIds : [],
      durationDays: days,
      slotsCount: Number(slotsCount) || 1,
      amount,
      startAt: start,
      endAt: end,
      paymentStatus: (effectiveIsSystem || free) ? 'paid' : 'unpaid',
      approvedBy: req.user?.id || req.user?.userId,
      status: (effectiveIsSystem || free) ? (start <= new Date() ? 'active' : 'scheduled') : 'pending_payment',
      title,
      subtitle,
      customImageUrl,
      targetUrl,
      isSystem: effectiveIsSystem,
      isDefault: !!isDefault
    }

    const item = await HeroPromotion.create(payload)

    // Notify seller if applicable
    if (sellerId && (effectiveIsSystem || free)) {
      try {
        await Notification.create({
          userId: Number(sellerId),
          title: effectiveIsSystem ? 'System Hero Promotion Created' : 'Free Hero Promotion Granted',
          message: `Your products have been included in a hero banner promotion for ${Number(days)} day(s). It will ${start <= new Date() ? 'go live immediately' : 'start on ' + start.toLocaleString()}.`
        })
      } catch { }
    }

    if (sellerId && !(effectiveIsSystem || free)) {
      try {
        await Notification.create({
          userId: Number(sellerId),
          title: 'Hero Promotion Offer - Payment Required',
          message: `An admin has created a hero banner promotion offer for your products. Total cost: KES ${amount}. Please submit payment and upload proof in your Seller > Promotions to proceed.`
        })
      } catch { }
    }

    // Invalidate homepage cache
    await cacheService.delPattern('homepage:*');
    return res.json({ ok: true, item })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

// Edit hero promotion (super admin)
const editHeroPromotion = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { productIds, durationDays, slotsCount, startAt, notes, title, subtitle } = req.body || {}
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })

    if (Array.isArray(productIds) && productIds.length) {
      const products = await Product.findAll({ where: { id: { [Op.in]: productIds }, sellerId: item.sellerId }, attributes: ['id'] })
      if (products.length !== productIds.length) return res.status(400).json({ error: 'One or more products do not belong to this seller' })
      item.productIds = productIds
    }

    if (durationDays != null) item.durationDays = Number(durationDays) || item.durationDays
    if (slotsCount != null) item.slotsCount = Number(slotsCount) || item.slotsCount
    if (notes) item.notes = notes
    if (title !== undefined) item.title = title
    if (subtitle !== undefined) item.subtitle = subtitle

    if (productIds || durationDays != null) {
      const { perDay, perProduct } = await getRateConfig()
      const ids = Array.isArray(item.productIds) ? item.productIds : []
      item.amount = (Number(item.durationDays) || 0) * (perDay + (ids.length * perProduct))
    }

    if (startAt) {
      const start = new Date(startAt)
      item.startAt = start
      const end = new Date(start)
      const days = Number(item.durationDays) || 7
      end.setDate(end.getDate() + days)
      item.endAt = end
      item.status = (start <= new Date()) ? 'active' : 'scheduled'
    }

    await item.save()
    // Invalidate homepage cache
    await cacheService.delPattern('homepage:*');
    res.json({ ok: true, item })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// Delete hero promotion (super admin)
const deleteHeroPromotion = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    await item.destroy()
    // Invalidate homepage cache
    await cacheService.delPattern('homepage:*');
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

const listHeroApplications = async (req, res) => {
  try {
    const { status, sellerId, promoType } = req.query
    // Auto-expire any past-due promotions to keep history accurate
    try {
      const now = new Date()
      await HeroPromotion.update(
        { status: 'expired' },
        { where: { endAt: { [Op.lt]: now }, status: { [Op.in]: ['approved', 'scheduled', 'active', 'under_review'] } } }
      )
    } catch { }
    const where = {}
    if (status) where.status = status
    if (sellerId) where.sellerId = Number(sellerId)
    if (promoType) where.promoType = promoType
    const items = await HeroPromotion.findAll({ where, order: [['createdAt', 'DESC']] })

    // Enrich with seller and product lookups for the frontend
    const sellerIds = [...new Set(items.map(i => i.sellerId))]
    const productIdsSet = new Set()
    const fastFoodIdsSet = new Set()
    
    items.forEach(i => {
      if (i.promoType === 'fastfood') {
         (i.fastFoodIds || []).forEach(pid => fastFoodIdsSet.add(pid))
      } else {
         (i.productIds || []).forEach(pid => productIdsSet.add(pid))
      }
    })

    const [users, products, fastfoods] = await Promise.all([
      User.findAll({
        where: { id: { [Op.in]: sellerIds } },
        attributes: ['id', 'name', 'email', 'phone']
      }),
      Product.findAll({
        where: { id: { [Op.in]: [...productIdsSet] } }
      }),
      FastFood.findAll({
        where: { id: { [Op.in]: [...fastFoodIdsSet] } }
      })
    ])

    res.json({ items, users, products, fastfoods })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

const getHeroApplication = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

const markPaymentReceived = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { paymentProofUrl } = req.body || {}
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    item.paymentStatus = 'paid'
    if (paymentProofUrl) item.paymentProofUrl = paymentProofUrl
    // move to under_review so admin can schedule
    item.status = 'under_review'
    await item.save()
    // Invalidate homepage cache
    await cacheService.delPattern('homepage:*');
    // Notify seller and acting admin
    try {
      await Notification.create({
        userId: item.sellerId,
        title: 'Payment Confirmed - Under Review',
        message: `Your payment for hero promotion (ID ${item.id}) has been confirmed. An admin will schedule it shortly.`
      })
    } catch { }
    try {
      const adminId = req.user?.id || req.user?.userId
      if (adminId) await Notification.create({ userId: adminId, title: 'Payment Marked as Received', message: `You confirmed payment for hero promotion ID ${item.id} (seller ${item.sellerId}).` })
    } catch { }
    res.json({ ok: true, item })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

const approveAndSchedule = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { startAt, durationDays, slotsCount, title, subtitle } = req.body || {}
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (item.paymentStatus !== 'paid') return res.status(400).json({ error: 'Payment not confirmed' })

    const start = startAt ? new Date(startAt) : new Date()
    const days = Number(durationDays) || item.durationDays || 7
    const end = new Date(start)
    end.setDate(end.getDate() + days)

    item.startAt = start
    item.endAt = end
    item.durationDays = days
    item.slotsCount = Number(slotsCount) || item.slotsCount || 1
    item.status = (start <= new Date()) ? 'active' : 'scheduled'
    item.approvedBy = req.user?.id || req.user?.userId
    if (title) item.title = title
    if (subtitle) item.subtitle = subtitle

    await item.save()
    res.json({ ok: true, item })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

const updateHeroPromotionSettings = async (req, res) => {
  try {
    const { perDay, perProduct, instructions } = req.body || {}
    const updates = []

    const setConfig = async (key, value) => {
      if (value === undefined || value === null) return
      const [config] = await PlatformConfig.findOrCreate({ where: { key }, defaults: { value: String(value) } })
      if (config.value !== String(value)) {
        config.value = String(value)
        await config.save()
      }
    }

    if (perDay !== undefined) {
      await setConfig('HERO_RATE_PER_DAY', perDay)
      updates.push('perDay')
    }
    if (perProduct !== undefined) {
      await setConfig('HERO_RATE_PER_PRODUCT', perProduct)
      updates.push('perProduct')
    }
    if (instructions !== undefined) {
      await setConfig('HERO_PAYMENT_INSTRUCTIONS', instructions)
      updates.push('instructions')
    }

    res.json({ ok: true, updated: updates })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const updateStatus = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { status, notes } = req.body || {}
    const allowed = ['rejected', 'cancelled', 'expired', 'active', 'scheduled', 'paused']
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    item.status = status
    if (notes) item.notes = notes
    await item.save()
    // Invalidate homepage cache
    await cacheService.delPattern('homepage:*');
    res.json({ ok: true, item })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

module.exports = {
  getRateConfig,
  refundHeroPromotion,
  createHeroPromotion,
  editHeroPromotion,
  deleteHeroPromotion,
  listHeroApplications,
  getHeroApplication,
  markPaymentReceived,
  approveAndSchedule,
  updateStatus,
  updateHeroPromotionSettings
};
