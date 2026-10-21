const { Op } = require('sequelize');
const { HeroPromotion, Product, User, Notification, PlatformConfig, FastFood, Subscription, Plan, PlanBenefit, Feature } = require('../../../database/models.registry');
const { shouldShowPromotion } = require('../../../utils/scheduleChecker');

const getRateConfig = async () => {
  const keys = [
    'HERO_RATE_PER_DAY',
    'HERO_RATE_PER_PRODUCT',
    'HERO_RATE_VIDEO_SURCHARGE',
    'HERO_DISCOUNT_7D',
    'HERO_DISCOUNT_14D',
    'HERO_DISCOUNT_30D',
    'HERO_PAYMENT_TYPE',
    'HERO_PAYMENT_TILL',
    'HERO_PAYMENT_TILL_NAME',
    'HERO_PAYMENT_PAYBILL',
    'HERO_PAYMENT_PAYBILL_ACC',
    'HERO_PAYMENT_ACCOUNT_REF',
    'HERO_PAYMENT_PHONE',
    'HERO_PAYMENT_PHONE_NAME',
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

const getHeroRates = async (req, res) => {
  try {
    const config = await getRateConfig()
    res.json(config)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// Seller: edit an application before approval (cannot edit approved/scheduled/active)
const editMyHeroPromotion = async (req, res) => {
  try {
    const sellerId = req.user?.id || req.user?.userId
    const id = Number(req.params.id)
    const { productIds, durationDays, slotsCount } = req.body || {}
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (item.sellerId !== sellerId) return res.status(403).json({ error: 'Forbidden' })

    if (['approved', 'scheduled', 'active'].includes(item.status)) {
      return res.status(400).json({ error: 'Cannot edit after approval' })
    }

    if (Array.isArray(productIds) && productIds.length) {
      const products = await Product.findAll({ where: { id: { [Op.in]: productIds }, sellerId, approved: true }, attributes: ['id'] })
      if (products.length !== productIds.length) return res.status(400).json({ error: 'Invalid products' })
      item.productIds = productIds
    }
    if (durationDays != null) item.durationDays = Number(durationDays) || item.durationDays
    if (slotsCount != null) item.slotsCount = Number(slotsCount) || item.slotsCount

    // Recompute amount if changed inputs
    if (productIds || durationDays != null) {
      const rates = await getRateConfig()
      const ids = Array.isArray(item.productIds) ? item.productIds : []
      const isVideo = Boolean(item.videoUrl)
      const calc = calculateHeroAmount(rates, { durationDays: item.durationDays, productCount: ids.length, isVideo })
      item.amount = calc.total
    }

    await item.save()
    return res.json({ ok: true, promotion: item })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}

// Seller: delete an application before approval. If already paid, mark refund requested.
const deleteMyHeroPromotion = async (req, res) => {
  try {
    const sellerId = req.user?.id || req.user?.userId
    const id = Number(req.params.id)
    const { reason } = req.body || {}
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (item.sellerId !== sellerId) return res.status(403).json({ error: 'Forbidden' })

    if (['approved', 'scheduled', 'active'].includes(item.status)) {
      return res.status(400).json({ error: 'Cannot delete after approval' })
    }

    if (item.paymentStatus === 'paid') {
      // Convert to refund request
      item.status = 'cancelled'
      item.paymentStatus = 'refund_requested'
      if (reason) item.notes = reason
      await item.save()
      // Notify admins and seller
      try {
        const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super_admin'] } }, attributes: ['id'], raw: true })
        for (const a of admins) {
          await Notification.create({
            userId: a.id,
            title: 'Refund Requested: Hero Promotion',
            message: `Seller ${sellerId} requested a refund for hero promotion ID ${item.id}. Amount: KES ${item.amount}.`
          })
        }
        await Notification.create({ userId: sellerId, title: 'Refund Request Submitted', message: `We received your refund request for hero promotion ID ${item.id}. Admin will process it soon.` })
      } catch { }
      return res.json({ ok: true, refundRequested: true, promotion: item })
    } else {
      // Soft-cancel to keep history visible to admins
      item.status = 'cancelled'
      if (reason) item.notes = reason
      await item.save()
      // Acknowledge seller
      try { await Notification.create({ userId: sellerId, title: 'Promotion Cancelled', message: `Your hero promotion ID ${item.id} was cancelled.` }) } catch { }
      return res.json({ ok: true, deleted: true, promotion: item })
    }
  } catch (e) { return res.status(500).json({ error: e.message }) }
}

// Seller: explicitly request refund (for paid-but-not-approved cases)
const requestRefund = async (req, res) => {
  try {
    const sellerId = req.user?.id || req.user?.userId
    const id = Number(req.params.id)
    const { reason } = req.body || {}
    const item = await HeroPromotion.findByPk(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (item.sellerId !== sellerId) return res.status(403).json({ error: 'Forbidden' })

    if (['approved', 'scheduled', 'active'].includes(item.status)) {
      return res.status(400).json({ error: 'Cannot refund after approval/scheduling' })
    }
    if (item.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Refund applicable only to paid applications' })
    }

    item.status = 'cancelled'
    item.paymentStatus = 'refund_requested'
    if (reason) item.notes = reason
    await item.save()
    // Notify admins and seller
    try {
      const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super_admin'] } }, attributes: ['id'], raw: true })
      for (const a of admins) {
        await Notification.create({ userId: a.id, title: 'Refund Requested: Hero Promotion', message: `Seller ${sellerId} requested a refund for hero promotion ID ${item.id}. Amount: KES ${item.amount}.` })
      }
      await Notification.create({ userId: sellerId, title: 'Refund Request Submitted', message: `We received your refund request for hero promotion ID ${item.id}. Admin will process it soon.` })
    } catch { }
    return res.json({ ok: true, promotion: item })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}

const applyHeroPromotion = async (req, res) => {
  try {
    const sellerId = req.user?.id || req.user?.userId
    const { productIds = [], fastFoodIds = [], durationDays = 7, slotsCount = 1, promoType = 'product', title, subtitle } = req.body || {}


    const ids = promoType === 'fastfood' ? fastFoodIds : productIds;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: promoType === 'fastfood' ? 'fastFoodIds required' : 'productIds required' })
    }

    if (!title || !title.trim() || !subtitle || !subtitle.trim()) {
      return res.status(400).json({ error: 'Banner heading (title) and subheading (subtitle) are strictly required.' })
    }

    // verify items belong to seller and are approved
    if (promoType === 'fastfood') {
      const fastfoods = await FastFood.findAll({
        where: { id: { [Op.in]: ids }, vendor: sellerId, approved: true },
        attributes: ['id']
      })
      if (fastfoods.length !== ids.length) {
        return res.status(400).json({ error: 'One or more fastfood items invalid or not approved' })
      }
    } else {
      const products = await Product.findAll({
        where: { id: { [Op.in]: ids }, sellerId, approved: true },
        attributes: ['id']
      })
      if (products.length !== ids.length) {
        return res.status(400).json({ error: 'One or more products invalid or not approved' })
      }
    }

    let isCoveredBySubscription = false;
    try {
      const activeSubs = await Subscription.findAll({
        where: { userId: sellerId, status: ['Active', 'Trial'] },
        include: [{
          model: Plan,
          as: 'plan',
          include: [{ model: PlanBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] }]
        }]
      });

      let marketingLimit = null;
      for (const sub of activeSubs) {
        if (sub.plan?.type !== 'seller') continue;
        const benefit = (sub.plan.benefits || []).find(b => b.feature?.code === 'marketing_items_limit');
        if (benefit) {
          const limitVal = benefit.value?.limit;
          if (limitVal && limitVal > 0) {
            marketingLimit = Math.max(marketingLimit || 0, limitVal);
          }
        }
      }

      if (marketingLimit !== null) {
        // Find existing active/scheduled/approved promotions and get unique item count
        const existingPromos = await HeroPromotion.findAll({
          where: {
            sellerId,
            status: ['approved', 'scheduled', 'active', 'under_review']
          }
        });

        const promotedItemIds = new Set();
        for (const promo of existingPromos) {
          const pIds = promo.productIds || [];
          const fIds = promo.fastFoodIds || [];
          pIds.forEach(id => promotedItemIds.add(`prod-${id}`));
          fIds.forEach(id => promotedItemIds.add(`food-${id}`));
        }

        // Add incoming item IDs
        const newEnrolledIds = ids.map(id => promoType === 'fastfood' ? `food-${id}` : `prod-${id}`);
        newEnrolledIds.forEach(id => promotedItemIds.add(id));

        if (promotedItemIds.size > marketingLimit) {
          return res.status(403).json({
            error: `Your subscription allows promoting a maximum of ${marketingLimit} unique items. You currently have ${promotedItemIds.size - newEnrolledIds.length} items promoted, and adding ${newEnrolledIds.length} more exceeds your plan limit. Please upgrade your plan.`
          });
        }

        // Covered by subscription
        isCoveredBySubscription = true;
      }
    } catch (subErr) {
      console.warn('[applyHeroPromotion] Subscription check failed (falling back to payment):', subErr.message);
    }

    const rates = await getRateConfig()
    const isVideo = Boolean(req.body.videoUrl)
    const calc = calculateHeroAmount(rates, { durationDays, productCount: ids.length, isVideo })
    const amount = isCoveredBySubscription ? 0 : calc.total

    const app = await HeroPromotion.create({
      sellerId,
      productIds: promoType === 'product' ? ids : [],
      fastFoodIds: promoType === 'fastfood' ? ids : [],
      promoType,
      status: isCoveredBySubscription ? 'approved' : 'pending_payment',
      paymentStatus: isCoveredBySubscription ? 'paid' : 'unpaid',
      amount,
      durationDays: Number(durationDays) || 7,
      slotsCount: Number(slotsCount) || 1,
      title,
      subtitle,
      notes: isCoveredBySubscription ? 'Covered by Subscription Marketing Limit Benefit.' : null
    })

    return res.json({ ok: true, promotion: app })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

const myHeroPromotions = async (req, res) => {
  try {
    const sellerId = req.user?.id || req.user?.userId
    // Auto-expire past items for accuracy
    try {
      const now = new Date()
      await HeroPromotion.update(
        { status: 'expired' },
        { where: { sellerId, endAt: { [Op.lt]: now }, status: { [Op.in]: ['approved', 'scheduled', 'active', 'under_review'] } } }
      )
    } catch { }
    const items = await HeroPromotion.findAll({ where: { sellerId }, order: [['createdAt', 'DESC']] })
    res.json({ items })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const locationMatches = (bannerLoc, targetLoc) => {
  if (!targetLoc) return true
  let locs = []
  if (Array.isArray(bannerLoc)) {
    locs = bannerLoc
  } else if (typeof bannerLoc === 'string') {
    try {
      const parsed = JSON.parse(bannerLoc)
      if (Array.isArray(parsed)) locs = parsed
      else locs = [bannerLoc]
    } catch {
      locs = bannerLoc.includes(',') ? bannerLoc.split(',').map(s => s.trim()) : [bannerLoc]
    }
  } else {
    locs = ['homepage']
  }
  const clean = locs.map(s => String(s || '').toLowerCase().trim()).filter(Boolean)
  if (clean.includes('all')) return true
  if (targetLoc === 'homepage' && (clean.length === 0 || clean.includes('homepage'))) return true
  if (targetLoc === 'category' && (clean.includes('category') || clean.includes('products'))) return true
  return clean.includes(targetLoc)
}

const listActiveHeroPromotions = async (req, res) => {
  // Prevent HTTP caching so new or edited banners appear immediately
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // Auto-expire banners whose endAt has passed and activate scheduled ones whose startAt <= now
  try {
    const now = new Date();
    await Promise.all([
      HeroPromotion.update(
        { status: 'expired' },
        { where: { endAt: { [Op.lt]: now }, status: { [Op.in]: ['approved', 'scheduled', 'active', 'under_review'] } } }
      ),
      HeroPromotion.update(
        { status: 'active' },
        { where: { startAt: { [Op.lte]: now }, endAt: { [Op.gte]: now }, status: 'scheduled' } }
      )
    ]);
  } catch { /* non-fatal, proceed */ }
  try {
    const now = new Date()
    const { location, bannerLocation } = req.query || {}
    const loc = (bannerLocation || location || '').toLowerCase().trim()

    // Build location where clause for database query
    const buildLocationFilter = () => {
      if (!loc) return {}
      if (loc === 'homepage') {
        return {
          [Op.or]: [
            { bannerLocation: 'homepage' },
            { bannerLocation: 'all' },
            { bannerLocation: null },
            { bannerLocation: '' },
            { bannerLocation: { [Op.like]: '%"homepage"%' } },
            { bannerLocation: { [Op.like]: '%"all"%' } },
            { bannerLocation: { [Op.like]: '%homepage%' } },
            { bannerLocation: { [Op.like]: '%all%' } }
          ]
        }
      }
      // 'category' pages also inherit 'products' banners; explicit 'category' banners take priority
      if (loc === 'category') {
        return {
          [Op.or]: [
            { bannerLocation: 'category' },
            { bannerLocation: 'products' },
            { bannerLocation: 'all' },
            { bannerLocation: { [Op.like]: '%"category"%' } },
            { bannerLocation: { [Op.like]: '%"products"%' } },
            { bannerLocation: { [Op.like]: '%"all"%' } },
            { bannerLocation: { [Op.like]: '%category%' } },
            { bannerLocation: { [Op.like]: '%products%' } },
            { bannerLocation: { [Op.like]: '%all%' } }
          ]
        }
      }
      return {
        [Op.or]: [
          { bannerLocation: loc },
          { bannerLocation: 'all' },
          { bannerLocation: { [Op.like]: `%"${loc}"%` } },
          { bannerLocation: { [Op.like]: '%"all"%' } },
          { bannerLocation: { [Op.like]: `%${loc}%` } },
          { bannerLocation: { [Op.like]: '%all%' } }
        ]
      }
    }

    const where = {
      status: { [Op.in]: ['active', 'scheduled'] },
      isDefault: false,
      startAt: { [Op.lte]: now },
      endAt: { [Op.gte]: now },
      ...buildLocationFilter()
    }

    // Get all potentially active promotions
    let items = await HeroPromotion.findAll({
      where,
      order: [['priority', 'DESC'], ['startAt', 'ASC']]
    })

    // Filter using location matcher and advanced schedule checker
    items = items.filter(item => locationMatches(item.bannerLocation, loc) && shouldShowPromotion(item, now))

    // Fallback: If no active promotions for this location, fetch default fallback banners
    if (items.length === 0) {
      const allDefaults = await HeroPromotion.findAll({
        where: {
          status: 'active',
          isDefault: true
        },
        order: [['priority', 'DESC'], ['createdAt', 'DESC']]
      })
      // Match against fallbackLocation (fallback to bannerLocation if not set)
      items = allDefaults.filter(item => {
        const targetFallback = (Array.isArray(item.fallbackLocation) && item.fallbackLocation.length > 0)
          ? item.fallbackLocation
          : item.bannerLocation
        return locationMatches(targetFallback, loc) && shouldShowPromotion(item, now)
      })
    }

    // hydrate with item details minimal
    const result = []
    for (const p of items) {
      if (p.promoType === 'fastfood') {
        const ids = p.fastFoodIds || []
        const fastfoods = ids.length > 0 ? await FastFood.findAll({
          where: { id: { [Op.in]: ids }, isAvailable: true },
          attributes: ['id', 'name', 'mainImage', 'galleryImages', 'basePrice', 'displayPrice', 'discountPrice', 'discountPercentage']
        }) : []
        result.push({ ...p.toJSON(), fastfoods })
      } else {
        const ids = p.productIds || []
        const prods = ids.length > 0 ? await Product.findAll({
          where: { id: { [Op.in]: ids }, stock: { [Op.gt]: 0 } },
          attributes: ['id', 'name', 'coverImage', 'galleryImages', 'price', 'displayPrice', 'discountPrice', 'discountPercentage']
        }) : []
        result.push({ ...p.toJSON(), products: prods })
      }
    }

    res.json({ items: result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Seller: submit or update payment proof for a hero promotion application
const submitPaymentProof = async (req, res) => {
  try {
    const sellerId = req.user?.id || req.user?.userId
    const id = Number(req.params.id)
    const { paymentProofUrl } = req.body || {}
    if (!paymentProofUrl) return res.status(400).json({ error: 'paymentProofUrl required' })

    const app = await HeroPromotion.findByPk(id)
    if (!app) return res.status(404).json({ error: 'Not found' })
    if (app.sellerId !== sellerId && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Only allow attaching proof when not already paid
    if (app.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Payment already confirmed by admin' })
    }

    app.paymentProofUrl = paymentProofUrl
    // Move to under_review so admin can verify and mark as paid
    app.status = 'under_review'
    await app.save()
    // Notify admins to review payment proof
    try {
      const admins = await User.findAll({ where: { role: { [Op.in]: ['admin', 'super_admin'] } }, attributes: ['id'], raw: true })
      for (const a of admins) {
        await Notification.create({ userId: a.id, title: 'Payment Proof Submitted', message: `Seller ${app.sellerId} submitted payment proof for hero promotion ID ${app.id}. Please review.` })
      }
      await Notification.create({ userId: app.sellerId, title: 'Payment Proof Received', message: `We received your payment proof for hero promotion ID ${app.id}. An admin will confirm soon.` })
    } catch { }
    return res.json({ ok: true, promotion: app })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

/**
 * Track a banner impression or click — lightweight analytics endpoint.
 * POST /hero-promotions/:id/track  { eventType: 'impression' | 'click' }
 * Public — no auth required (rate-limit at nginx/API level if needed).
 */
const trackBannerEvent = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { eventType = 'impression' } = req.body || {};
    if (!['impression', 'click'].includes(eventType)) {
      return res.status(400).json({ error: 'eventType must be impression or click' });
    }
    // We store counts directly on the HeroPromotion row using a JSON analytics field.
    // If the row doesn't have it yet we initialise it.
    const promo = await HeroPromotion.findByPk(id);
    if (!promo) return res.status(404).json({ error: 'Not found' });

    // Use a raw increment to avoid race conditions and skip unnecessary hooks
    if (eventType === 'impression') {
      await HeroPromotion.increment('impressions', { where: { id }, silent: true });
    } else {
      await HeroPromotion.increment('clicks', { where: { id }, silent: true });
    }

    return res.json({ ok: true });
  } catch (e) {
    // Silently swallow — analytics failure should never break the frontend
    return res.status(200).json({ ok: true });
  }
};

/**
 * AI Suggestions for Hero Banner Copy & Badges
 * POST /api/hero-promotions/ai-suggest or /api/admin/hero-promotions/ai-suggest
 */
const HeroBannerAIService = require('../services/HeroBannerAIService');
const aiSuggestBannerContent = async (req, res) => {
  try {
    const {
      promoType = 'product',
      type = 'seller',
      items: incomingItems = [],
      productIds = [],
      fastFoodIds = [],
      bannerLocation = ['homepage'],
      currentValues = {}
    } = req.body || {};

    let items = Array.isArray(incomingItems) ? [...incomingItems] : [];

    // If item details weren't passed directly, hydrate from IDs
    if (items.length === 0) {
      if (promoType === 'fastfood' && Array.isArray(fastFoodIds) && fastFoodIds.length > 0) {
        const foods = await FastFood.findAll({
          where: { id: { [Op.in]: fastFoodIds } },
          attributes: ['id', 'name', 'description', 'price', 'discountPrice']
        });
        items = foods.map(f => f.toJSON ? f.toJSON() : f);
      } else if (Array.isArray(productIds) && productIds.length > 0) {
        const prods = await Product.findAll({
          where: { id: { [Op.in]: productIds } },
          attributes: ['id', 'name', 'description', 'price', 'discountPrice', 'discountPercentage']
        });
        items = prods.map(p => p.toJSON ? p.toJSON() : p);
      }
    }

    const suggestions = await HeroBannerAIService.suggest({
      promoType,
      type,
      items,
      bannerLocation,
      currentValues
    });

    return res.json({ ok: true, suggestions });
  } catch (err) {
    console.error('[aiSuggestBannerContent] Error:', err);
    return res.status(500).json({ error: 'Failed to generate AI suggestions', details: err.message });
  }
};

module.exports = {
  getHeroRates,
  editMyHeroPromotion,
  deleteMyHeroPromotion,
  requestRefund,
  applyHeroPromotion,
  myHeroPromotions,
  listActiveHeroPromotions,
  submitPaymentProof,
  trackBannerEvent,
  aiSuggestBannerContent
};
