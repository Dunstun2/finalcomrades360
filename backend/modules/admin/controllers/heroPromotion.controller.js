const { Op } = require('sequelize');
const { HeroPromotion, Product, User, Notification, PlatformConfig, FastFood } = require('../../../database/models.registry');
const cacheService = require('../../../scripts/services/cacheService');

// Pricing config & Tiered calculations
const getRateConfig = async () => {
  const keys = [
    'HERO_RATE_PER_DAY',
    'HERO_RATE_PER_PRODUCT',
    'HERO_RATE_VIDEO_SURCHARGE',
    'HERO_DISCOUNT_7D',
    'HERO_DISCOUNT_14D',
    'HERO_DISCOUNT_30D',
    'HERO_PAYMENT_TYPE',        // 'till' | 'paybill' | 'send_money'
    'HERO_PAYMENT_TILL',
    'HERO_PAYMENT_TILL_NAME',
    'HERO_PAYMENT_PAYBILL',     // Business Number (e.g. 247247)
    'HERO_PAYMENT_PAYBILL_ACC', // Account Number (e.g. 0123456789)
    'HERO_PAYMENT_ACCOUNT_REF', // Optional format / ref (e.g. HERO-{id})
    'HERO_PAYMENT_PHONE',       // Send Money Phone (e.g. 0712345678)
    'HERO_PAYMENT_PHONE_NAME',  // Recipient Name
    'HERO_PAYMENT_INSTRUCTIONS'
  ]
  const rows = await PlatformConfig.findAll({ where: { key: { [Op.in]: keys } }, raw: true })
  const map = new Map(rows.map(r => [r.key, r.value]))

  const perDay = Number.isFinite(parseFloat(map.get('HERO_RATE_PER_DAY'))) ? parseFloat(map.get('HERO_RATE_PER_DAY')) : 500
  const perProduct = Number.isFinite(parseFloat(map.get('HERO_RATE_PER_PRODUCT'))) ? parseFloat(map.get('HERO_RATE_PER_PRODUCT')) : 100
  const videoSurcharge = Number.isFinite(parseFloat(map.get('HERO_RATE_VIDEO_SURCHARGE'))) ? parseFloat(map.get('HERO_RATE_VIDEO_SURCHARGE')) : 150
  const discount7d = Number.isFinite(parseFloat(map.get('HERO_DISCOUNT_7D'))) ? parseFloat(map.get('HERO_DISCOUNT_7D')) : 10
  const discount14d = Number.isFinite(parseFloat(map.get('HERO_DISCOUNT_14D'))) ? parseFloat(map.get('HERO_DISCOUNT_14D')) : 15
  const discount30d = Number.isFinite(parseFloat(map.get('HERO_DISCOUNT_30D'))) ? parseFloat(map.get('HERO_DISCOUNT_30D')) : 25
  const paymentType = map.get('HERO_PAYMENT_TYPE') || 'till'
  const paymentTill = map.get('HERO_PAYMENT_TILL') || '123456'
  const paymentTillName = map.get('HERO_PAYMENT_TILL_NAME') || 'Comrades360'
  const paymentPaybill = map.get('HERO_PAYMENT_PAYBILL') || '247247'
  const paymentPaybillAcc = map.get('HERO_PAYMENT_PAYBILL_ACC') || ''
  const paymentAccountRef = map.get('HERO_PAYMENT_ACCOUNT_REF') || 'HERO-{id}'
  const paymentPhone = map.get('HERO_PAYMENT_PHONE') || ''
  const paymentPhoneName = map.get('HERO_PAYMENT_PHONE_NAME') || ''
  const instructions = map.get('HERO_PAYMENT_INSTRUCTIONS') || 'Please pay via M-Pesa and upload the confirmation message screenshot.'

  return {
    perDay,
    perProduct,
    videoSurcharge,
    discount7d,
    discount14d,
    discount30d,
    paymentType,
    paymentTill,
    paymentTillName,
    paymentPaybill,
    paymentPaybillAcc,
    paymentAccountRef,
    paymentPhone,
    paymentPhoneName,
    instructions
  }
}

const calculateHeroAmount = (rates, { durationDays, productCount, isVideo }) => {
  const days = Number(durationDays) || 7
  const count = Number(productCount) || 0
  const perDay = Number(rates.perDay) || 500
  const perProduct = Number(rates.perProduct) || 100
  const videoSurcharge = Number(rates.videoSurcharge) || 150
  const discount7d = Number(rates.discount7d) || 10
  const discount14d = Number(rates.discount14d) || 15
  const discount30d = Number(rates.discount30d) || 25

  const baseCost = days * perDay
  const productCost = days * count * perProduct
  const videoCost = isVideo ? (days * videoSurcharge) : 0
  const subtotal = baseCost + productCost + videoCost

  let discountPercent = 0
  if (days >= 30) discountPercent = discount30d
  else if (days >= 14) discountPercent = discount14d
  else if (days >= 7) discountPercent = discount7d

  const discountAmount = Math.round(subtotal * (discountPercent / 100))
  const total = Math.max(0, subtotal - discountAmount)

  return {
    days,
    count,
    isVideo,
    baseCost,
    productCost,
    videoCost,
    subtotal,
    discountPercent,
    discountAmount,
    total
  }
}

const normalizeBannerLocation = (loc, fallbackType) => {
  if (Array.isArray(loc) && loc.length > 0) {
    const clean = loc.map(s => String(s).toLowerCase().trim()).filter(Boolean)
    return clean.length > 0 ? clean : [fallbackType === 'fastfood' ? 'fastfood' : 'homepage']
  }
  if (typeof loc === 'string' && loc.trim()) {
    try {
      const parsed = JSON.parse(loc)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = parsed.map(s => String(s).toLowerCase().trim()).filter(Boolean)
        return clean.length > 0 ? clean : [fallbackType === 'fastfood' ? 'fastfood' : 'homepage']
      }
    } catch {}
    if (loc.includes(',')) {
      const parts = loc.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      return parts.length > 0 ? parts : [fallbackType === 'fastfood' ? 'fastfood' : 'homepage']
    }
    return [loc.trim().toLowerCase()]
  }
  return [fallbackType === 'fastfood' ? 'fastfood' : 'homepage']
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
      fastFoodIds = [],
      promoType = 'product',
      durationDays = 7,
      slotsCount = 1,
      startAt,
      free,
      title,
      subtitle,
      customImageUrl,
      targetUrl,
      ctaText,
      buttonText,
      eyebrow,
      promoBadge,
      link,
      isDefault,
      isSystem,
      trustPoints,
      // Video fields
      videoUrl,
      videoType,
      videoAutoplay,
      videoLoop,
      videoMuted,
      mediaMode,
      // Advanced scheduling fields
      scheduleType,
      recurringDays,
      specificDates,
      timeSlotStart,
      timeSlotEnd,
      timezone,
      dateTimeMode,
      dateSpecificTimes,
      bannerLocation = 'homepage'
    } = req.body || {}

    const effectiveIsSystem = !!(isSystem || !sellerId);
    const isFastFood = promoType === 'fastfood';
    const ids = isFastFood ? fastFoodIds : productIds;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Banner heading (title) is required' })
    }
    if (!subtitle || !subtitle.trim()) {
      return res.status(400).json({ error: 'Short description (subtitle) is required' })
    }
    if (!eyebrow || !eyebrow.trim()) {
      return res.status(400).json({ error: 'Eyebrow pill badge is required' })
    }
    if (!(ctaText || buttonText) || !(ctaText || buttonText).trim()) {
      return res.status(400).json({ error: 'CTA button text is required' })
    }
    if (!(targetUrl || link) || !(targetUrl || link).trim()) {
      return res.status(400).json({ error: 'CTA target link URL is required' })
    }

    if (!effectiveIsSystem && !sellerId) {
      return res.status(400).json({ error: 'sellerId required for non-system promotions' })
    }

    if (!customImageUrl && !videoUrl && (!Array.isArray(ids) || ids.length === 0)) {
      return res.status(400).json({ error: 'Either customImageUrl, videoUrl, or item IDs required' })
    }

    // verify items belong to seller and are approved (admin can bypass ownership for system promos)
    if (isFastFood && fastFoodIds.length > 0 && sellerId) {
      const fastfoods = await FastFood.findAll({
        where: { id: { [Op.in]: fastFoodIds }, vendor: sellerId },
        attributes: ['id']
      })
      if (fastfoods.length !== fastFoodIds.length) {
        return res.status(400).json({ error: 'One or more fast food items do not belong to this vendor' })
      }
    } else if (!isFastFood && productIds.length > 0 && sellerId) {
      // Admin can feature any seller product — only verify ownership, not approval status
      const prods = await Product.findAll({
        where: { id: { [Op.in]: productIds }, sellerId },
        attributes: ['id']
      })
      if (prods.length !== productIds.length) {
        return res.status(400).json({ error: 'One or more products do not belong to this seller' })
      }
    }

    const rates = await getRateConfig()
    // Not all banners created by admin are free.
    // A promotion is free only if explicitly marked free, or amount is set to 0.
    const isFree = free === true || req.body.isFree === true || (req.body.amount !== undefined && Number(req.body.amount) === 0)
    const isVideo = Boolean(videoUrl)
    const calc = calculateHeroAmount(rates, { durationDays, productCount: ids.length, isVideo })
    const amount = isFree ? 0 : (req.body.amount !== undefined ? Number(req.body.amount) : calc.total)

    const start = startAt ? new Date(startAt) : new Date()
    const days = Number(durationDays) || 7
    const end = new Date(start)
    // Default/system banners are perpetual — give them a far-future endAt so date-range queries always include them
    if (!!isDefault || effectiveIsSystem) {
      end.setFullYear(end.getFullYear() + 100)
    } else {
      end.setDate(end.getDate() + days)
    }

    const payload = {
      sellerId: sellerId ? Number(sellerId) : null,
      productIds: isFastFood ? [] : (Array.isArray(productIds) ? productIds : []),
      fastFoodIds: isFastFood ? (Array.isArray(fastFoodIds) ? fastFoodIds : []) : [],
      promoType,
      durationDays: days,
      slotsCount: Number(slotsCount) || 1,
      amount,
      startAt: start,
      endAt: end,
      paymentStatus: isFree ? 'free' : (req.body.paymentStatus || (effectiveIsSystem ? 'paid' : 'unpaid')),
      approvedBy: req.user?.id || req.user?.userId,
      status: (effectiveIsSystem || isFree || req.body.paymentStatus === 'paid') ? (start <= new Date() ? 'active' : 'scheduled') : 'pending_payment',
      title,
      subtitle,
      customImageUrl,
      targetUrl: targetUrl || link || null,
      ctaText: ctaText || buttonText || null,
      eyebrow: eyebrow || promoBadge || null,
      isSystem: effectiveIsSystem,
      isDefault: !!isDefault,
      trustPoints: Array.isArray(trustPoints) ? trustPoints.slice(0, 3) : [],
      // Video fields
      videoUrl: videoUrl || null,
      videoType: videoType || 'background',
      videoAutoplay: videoAutoplay !== undefined ? videoAutoplay : true,
      videoLoop: videoLoop !== undefined ? videoLoop : true,
      videoMuted: videoMuted !== undefined ? videoMuted : true,
      // Advanced scheduling fields
      scheduleType: scheduleType || 'continuous',
      recurringDays: Array.isArray(recurringDays) ? recurringDays : [],
      specificDates: Array.isArray(specificDates) ? specificDates : [],
      timeSlotStart: timeSlotStart || null,
      timeSlotEnd: timeSlotEnd || null,
      timezone: timezone || 'Africa/Nairobi',
      dateTimeMode: dateTimeMode || 'same',
      dateSpecificTimes: dateSpecificTimes || {},
      bannerLocation: normalizeBannerLocation(bannerLocation, promoType),
      mediaMode: mediaMode || 'image'
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
    const {
      sellerId,
      productIds,
      fastFoodIds,
      durationDays,
      slotsCount,
      startAt,
      endAt,
      status,
      isSystem,
      isDefault,
      notes,
      title,
      subtitle,
      customImageUrl,
      targetUrl,
      ctaText,
      buttonText,
      eyebrow,
      promoBadge,
      link,
      trustPoints,
      // Video fields
      videoUrl,
      videoType,
      videoAutoplay,
      videoLoop,
      videoMuted,
      mediaMode,
      // Advanced scheduling fields
      scheduleType,
      recurringDays,
      specificDates,
      timeSlotStart,
      timeSlotEnd,
      timezone,
      dateTimeMode,
      dateSpecificTimes,
      bannerLocation
    } = req.body || {}
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })

    if (sellerId !== undefined) item.sellerId = sellerId ? Number(sellerId) : null
    if (isSystem !== undefined) item.isSystem = !!isSystem
    if (isDefault !== undefined) item.isDefault = !!isDefault
    if (status !== undefined) item.status = status

    if (item.isSystem) {
      item.paymentStatus = 'paid'
    }

    if (item.promoType === 'fastfood') {
      if (Array.isArray(fastFoodIds) && fastFoodIds.length) {
        item.fastFoodIds = fastFoodIds
      }
    } else {
      if (Array.isArray(productIds) && productIds.length) {
        if (item.sellerId) {
          const products = await Product.findAll({ where: { id: { [Op.in]: productIds }, sellerId: item.sellerId }, attributes: ['id'] })
          if (products.length !== productIds.length) return res.status(400).json({ error: 'One or more products do not belong to this seller' })
        }
        item.productIds = productIds
      }
    }

    if (durationDays != null) item.durationDays = Number(durationDays) || item.durationDays
    if (slotsCount != null) item.slotsCount = Number(slotsCount) || item.slotsCount
    if (notes) item.notes = notes
    if (title !== undefined) item.title = title
    if (subtitle !== undefined) item.subtitle = subtitle
    if (customImageUrl !== undefined) item.customImageUrl = customImageUrl
    if (targetUrl !== undefined || link !== undefined) item.targetUrl = targetUrl || link
    if (ctaText !== undefined || buttonText !== undefined) item.ctaText = ctaText || buttonText
    if (eyebrow !== undefined || promoBadge !== undefined) item.eyebrow = eyebrow || promoBadge
    if (trustPoints !== undefined) item.trustPoints = Array.isArray(trustPoints) ? trustPoints.slice(0, 3) : []
    if (bannerLocation !== undefined) item.bannerLocation = normalizeBannerLocation(bannerLocation, item.promoType)

    // Video fields
    if (videoUrl !== undefined) item.videoUrl = videoUrl
    if (videoType !== undefined) item.videoType = videoType
    if (videoAutoplay !== undefined) item.videoAutoplay = videoAutoplay
    if (videoLoop !== undefined) item.videoLoop = videoLoop
    if (videoMuted !== undefined) item.videoMuted = videoMuted
    if (mediaMode !== undefined) item.mediaMode = mediaMode

    // Advanced scheduling fields
    if (scheduleType !== undefined) item.scheduleType = scheduleType
    if (recurringDays !== undefined) item.recurringDays = Array.isArray(recurringDays) ? recurringDays : []
    if (specificDates !== undefined) item.specificDates = Array.isArray(specificDates) ? specificDates : []
    if (timeSlotStart !== undefined) item.timeSlotStart = timeSlotStart
    if (timeSlotEnd !== undefined) item.timeSlotEnd = timeSlotEnd
    if (timezone !== undefined) item.timezone = timezone
    if (dateTimeMode !== undefined) item.dateTimeMode = dateTimeMode
    if (dateSpecificTimes !== undefined) item.dateSpecificTimes = dateSpecificTimes

    if (req.body.amount !== undefined) {
      item.amount = Number(req.body.amount)
    } else if (req.body.free || req.body.isFree) {
      item.amount = 0
    } else if ((productIds || fastFoodIds || durationDays != null) && !item.isSystem && item.sellerId) {
      const rates = await getRateConfig()
      const ids = item.promoType === 'fastfood'
        ? (Array.isArray(item.fastFoodIds) ? item.fastFoodIds : [])
        : (Array.isArray(item.productIds) ? item.productIds : [])
      const isVideo = Boolean(item.videoUrl)
      const calc = calculateHeroAmount(rates, { durationDays: item.durationDays, productCount: ids.length, isVideo })
      item.amount = calc.total
    }

    if (req.body.paymentStatus !== undefined) {
      item.paymentStatus = req.body.paymentStatus
    } else if (Number(item.amount) === 0 || req.body.free || req.body.isFree) {
      item.paymentStatus = 'free'
    }

    if (endAt) {
      item.endAt = new Date(endAt)
    }

    if (startAt) {
      const start = new Date(startAt)
      item.startAt = start
      // Default/system banners get a far-future endAt regardless of durationDays
      if (item.isDefault || item.isSystem) {
        if (!endAt) {
          const farFuture = new Date(start)
          farFuture.setFullYear(farFuture.getFullYear() + 100)
          item.endAt = farFuture
        }
      } else {
        const days = Number(item.durationDays) || 7
        let calculatedEnd = new Date(start)
        calculatedEnd.setDate(calculatedEnd.getDate() + days)
        // If the calculated end date would already be in the past, extend it from now so it stays active
        if (calculatedEnd < new Date() && !endAt) {
          calculatedEnd = new Date()
          calculatedEnd.setDate(calculatedEnd.getDate() + days)
        }
        if (!endAt) {
          item.endAt = calculatedEnd
        }
      }
      if (!status) {
        item.status = (start <= new Date()) ? 'active' : 'scheduled'
      }
    }

    // If isDefault/isSystem was just toggled ON and no explicit endAt was sent, push endAt to far future
    if ((item.isDefault || item.isSystem) && !endAt && !startAt) {
      const currentEnd = item.endAt ? new Date(item.endAt) : new Date()
      if (currentEnd < new Date()) {
        const farFuture = new Date()
        farFuture.setFullYear(farFuture.getFullYear() + 100)
        item.endAt = farFuture
      }
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

    if (item.isDefault) {
      return res.status(400).json({
        error: 'Cannot delete a default banner. Please turn off its default fallback state first before deleting.'
      })
    }

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
    // Skip banners with continuous scheduling (they should stay active regardless of endAt)
    try {
      const now = new Date()
      await HeroPromotion.update(
        { status: 'expired' },
        { where: {
          endAt: { [Op.lt]: now },
          status: { [Op.in]: ['approved', 'scheduled', 'active', 'under_review'] },
          scheduleType: { [Op.or]: [{ [Op.eq]: null }, { [Op.ne]: 'continuous' }] }
        } }
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
    const { startAt, durationDays, slotsCount, title, subtitle, trustPoints } = req.body || {}
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
    if (trustPoints) item.trustPoints = Array.isArray(trustPoints) ? trustPoints.slice(0, 3) : []

    await item.save()
    res.json({ ok: true, item })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

const updateHeroPromotionSettings = async (req, res) => {
  try {
    const {
      perDay,
      perProduct,
      videoSurcharge,
      discount7d,
      discount14d,
      discount30d,
      paymentType,
      paymentTill,
      paymentTillName,
      paymentPaybill,
      paymentPaybillAcc,
      paymentAccountRef,
      paymentPhone,
      paymentPhoneName,
      instructions
    } = req.body || {}
    const updates = []

    const setConfig = async (key, value) => {
      if (value === undefined || value === null) return
      const [config] = await PlatformConfig.findOrCreate({ where: { key }, defaults: { value: String(value) } })
      if (config.value !== String(value)) {
        config.value = String(value)
        await config.save()
      }
    }

    if (perDay !== undefined) { await setConfig('HERO_RATE_PER_DAY', perDay); updates.push('perDay') }
    if (perProduct !== undefined) { await setConfig('HERO_RATE_PER_PRODUCT', perProduct); updates.push('perProduct') }
    if (videoSurcharge !== undefined) { await setConfig('HERO_RATE_VIDEO_SURCHARGE', videoSurcharge); updates.push('videoSurcharge') }
    if (discount7d !== undefined) { await setConfig('HERO_DISCOUNT_7D', discount7d); updates.push('discount7d') }
    if (discount14d !== undefined) { await setConfig('HERO_DISCOUNT_14D', discount14d); updates.push('discount14d') }
    if (discount30d !== undefined) { await setConfig('HERO_DISCOUNT_30D', discount30d); updates.push('discount30d') }
    if (paymentType !== undefined) { await setConfig('HERO_PAYMENT_TYPE', paymentType); updates.push('paymentType') }
    if (paymentTill !== undefined) { await setConfig('HERO_PAYMENT_TILL', paymentTill); updates.push('paymentTill') }
    if (paymentTillName !== undefined) { await setConfig('HERO_PAYMENT_TILL_NAME', paymentTillName); updates.push('paymentTillName') }
    if (paymentPaybill !== undefined) { await setConfig('HERO_PAYMENT_PAYBILL', paymentPaybill); updates.push('paymentPaybill') }
    if (paymentPaybillAcc !== undefined) { await setConfig('HERO_PAYMENT_PAYBILL_ACC', paymentPaybillAcc); updates.push('paymentPaybillAcc') }
    if (paymentAccountRef !== undefined) { await setConfig('HERO_PAYMENT_ACCOUNT_REF', paymentAccountRef); updates.push('paymentAccountRef') }
    if (paymentPhone !== undefined) { await setConfig('HERO_PAYMENT_PHONE', paymentPhone); updates.push('paymentPhone') }
    if (paymentPhoneName !== undefined) { await setConfig('HERO_PAYMENT_PHONE_NAME', paymentPhoneName); updates.push('paymentPhoneName') }
    if (instructions !== undefined) { await setConfig('HERO_PAYMENT_INSTRUCTIONS', instructions); updates.push('instructions') }

    const latestRates = await getRateConfig()
    res.json({ ok: true, updated: updates, rates: latestRates })
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
