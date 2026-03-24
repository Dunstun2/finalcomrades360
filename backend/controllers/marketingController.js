const { Op } = require('sequelize');
const {
  Product,
  User,
  Order,
  ReferralTracking,
  MarketingAnalytics,
  Commission
} = require('../models');

const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

const backendBaseFromReq = (req) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host');
  return `${proto}://${host}`;
};

// GET /api/marketing/share-url/:productId
const getShareUrl = async (req, res) => {
  try {
    const marketerId = req.user?.id || req.user?.userId;
    const marketer = await User.findByPk(marketerId);
    if (!marketer || marketer.role !== 'marketer') {
      return res.status(403).json({ error: 'Only marketers can generate share links' });
    }

    const { productId } = req.params;
    const product = await Product.findByPk(productId);
    if (!product || !product.approved) return res.status(404).json({ error: 'Product not found' });

    const ref = marketer.referralCode;
    if (!ref) return res.status(400).json({ error: 'No referral code on marketer account' });

    const backendBase = backendBaseFromReq(req);
    const redirectBase = `${backendBase}/api/marketing/r?productId=${product.id}&ref=${encodeURIComponent(ref)}`;
    const canonicalProductUrl = `${FRONTEND_BASE}/product/${product.id}?ref=${encodeURIComponent(ref)}`;

    const text = encodeURIComponent(`${product.name} on Comrades360`);
    const urlEnc = encodeURIComponent(`${redirectBase}&platform=`);

    const platforms = {
      whatsapp: `https://wa.me/?text=${text}%20${urlEnc}whatsapp`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${urlEnc}facebook`,
      twitter: `https://twitter.com/intent/tweet?url=${urlEnc}twitter&text=${text}`,
      telegram: `https://t.me/share/url?url=${urlEnc}telegram&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${urlEnc}linkedin`,
      messenger: `fb-messenger://share/?link=${urlEnc}messenger`,
      sms: `sms:?&body=${text}%20${urlEnc}sms`,
      copy: `${redirectBase}&platform=copy`,
      generic: `${redirectBase}&platform=share` // for Web Share API
    };

    res.json({
      productId: product.id,
      referralCode: ref,
      redirectUrlBase: redirectBase,
      canonicalProductUrl,
      platforms
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/marketing/r?productId=&ref=&platform=
const redirectTracker = async (req, res) => {
  try {
    const productId = parseInt(req.query.productId, 10);
    const referralCode = String(req.query.ref || '').trim();
    const platform = String(req.query.platform || 'unknown').toLowerCase();
    if (!productId || !referralCode) return res.status(400).json({ error: 'Missing productId or ref' });

    const product = await Product.findByPk(productId);
    if (!product || !product.approved) return res.status(404).json({ error: 'Product not found' });

    const marketer = await User.findOne({ where: { referralCode, role: 'marketer' } });
    const referrerId = marketer ? marketer.id : null;

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    // Create click tracking record
    try {
      await ReferralTracking.create({
        referrerId: referrerId || 0,
        referredUserId: null,
        productId,
        orderId: null,
        referralCode,
        clickedAt: new Date(),
        ipAddress,
        userAgent,
        socialPlatform: platform
      });
    } catch (_) { }

    try {
      await MarketingAnalytics.create({
        marketerId: referrerId || 0,
        productId,
        platform,
        actionType: 'click',
        userId: null,
        ipAddress,
        userAgent,
        referralCode,
        shareUrl: `${backendBaseFromReq(req)}/api/marketing/r?productId=${productId}&ref=${encodeURIComponent(referralCode)}&platform=${platform}`,
        metadata: {}
      });
    } catch (_) { }

    const target = `${FRONTEND_BASE}/product/${productId}?ref=${encodeURIComponent(referralCode)}`;
    res.redirect(302, target);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/marketing/track-share { productId, platform }
const trackShare = async (req, res) => {
  try {
    const marketerId = req.user?.id || req.user?.userId;
    const { productId, platform } = req.body || {};
    const product = await Product.findByPk(productId);
    if (!product || !product.approved) return res.status(404).json({ error: 'Product not found' });

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    await MarketingAnalytics.create({
      marketerId,
      productId: product.id,
      platform: String(platform || 'unknown').toLowerCase(),
      actionType: 'share',
      userId: marketerId,
      ipAddress,
      userAgent,
      referralCode: req.user?.referralCode || null,
      shareUrl: `${backendBaseFromReq(req)}/api/marketing/r?productId=${product.id}&ref=${encodeURIComponent(req.user?.referralCode || '')}&platform=${encodeURIComponent(platform || 'unknown')}`,
      metadata: {}
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/marketing/stats/my
const myStats = async (req, res) => {
  try {
    const marketerId = req.user?.id || req.user?.userId;

    // Clicks per product
    const clicksRows = await ReferralTracking.findAll({
      attributes: ['productId', 'socialPlatform', [MarketingAnalytics.sequelize.fn('COUNT', MarketingAnalytics.sequelize.col('id')), 'count']],
      where: { referrerId: marketerId },
      group: ['productId', 'socialPlatform']
    });

    // Conversions per product (via ReferralTracking)
    const convRows = await ReferralTracking.findAll({
      attributes: ['productId', [MarketingAnalytics.sequelize.fn('COUNT', MarketingAnalytics.sequelize.col('id')), 'count']],
      where: { referrerId: marketerId, convertedAt: { [Op.not]: null } },
      group: ['productId']
    });

    // Commission totals per product
    const commRows = await Commission.findAll({
      attributes: ['productId', [Commission.sequelize.fn('SUM', Commission.sequelize.col('commissionAmount')), 'commission']],
      where: { marketerId },
      group: ['productId']
    });

    res.json({ clicks: clicksRows, conversions: convRows, commissions: commRows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/marketing/customer-lookup?query=
const lookupCustomer = async (req, res) => {
  try {
    const { query: rawQuery } = req.query;
    if (!rawQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const query = rawQuery.trim();

    // Attempt to find by exact match (priority) or partial match
    const whereCondition = {
      [Op.or]: [
        { email: query }, // Exact match
        { phone: query }, // Exact match
        { phone: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { name: { [Op.like]: `%${query}%` } }
      ]
    };

    console.log('🔍 Customer Lookup Query:', query);

    // Debug: Check total users to verify DB connection
    const totalUsers = await User.count();
    console.log('📊 Total Users in DB:', totalUsers);

    const customer = await User.findOne({
      where: whereCondition,
      attributes: ['name', 'phone', 'email', 'county', 'town', 'estate', 'houseNumber']
    });

    if (!customer) {
      console.log('❌ Customer lookup returned NULL for query:', query);

      // Debug: Dump first 10 users to see what IS in the DB
      const existingUsers = await User.findAll({
        limit: 10,
        attributes: ['id', 'name', 'email']
      });
      console.log('📋 Existing Users (First 10):', existingUsers.map(u => `${u.id}: ${u.name} (${u.email})`));

      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    console.log('✅ Found Customer:', customer.name, customer.email);

    const addressParts = [
      customer.county,
      customer.town,
      customer.estate,
      customer.houseNumber
    ].filter(Boolean);

    res.json({
      success: true,
      customer: {
        ...customer.toJSON(),
        address: addressParts.join(', ')
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/marketing/my-customers
// Returns customers that:
// (a) registered using the marketer's referral code OR
// (b) have received orders placed by the marketer
// Each customer is enriched with referralCode, orderCount, and hasPendingOrders
const getMyCustomers = async (req, res) => {
  try {
    const marketerId = req.user?.id;
    const marketer = await User.findByPk(marketerId, { attributes: ['referralCode'] });
    const marketerReferralCode = marketer?.referralCode;

    const customerMap = {};

    // 1. Users who registered with this marketer's referral code
    if (marketerReferralCode) {
      const referredUsers = await User.findAll({
        where: { referredByReferralCode: marketerReferralCode },
        attributes: ['id', 'name', 'email', 'phone', 'referralCode', 'createdAt']
      });
      referredUsers.forEach(u => {
        customerMap[u.id] = { ...u.toJSON(), source: 'referred' };
      });
    }

    // 2. Existing system users who have received orders from this marketer
    const ordersPlacedByMarketer = await Order.findAll({
      where: {
        marketerId,
        isMarketingOrder: true,
        userId: { [Op.ne]: marketerId }
      },
      attributes: ['userId', 'customerName', 'customerEmail', 'customerPhone', 'createdAt'],
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'referralCode', 'createdAt', 'businessName'], required: false }]
    });

    ordersPlacedByMarketer.forEach(order => {
      const u = order.user;
      if (u && !customerMap[u.id]) {
        customerMap[u.id] = { ...u.toJSON(), source: 'order_recipient' };
      } else if (!u && order.customerEmail) {
        const key = `guest_${order.customerEmail}`;
        if (!customerMap[key]) {
          customerMap[key] = {
            id: null,
            name: order.customerName,
            email: order.customerEmail,
            phone: order.customerPhone,
            referralCode: null,
            createdAt: order.createdAt,
            source: 'guest_order'
          };
        }
      }
    });

    // 3. Enrich each registered customer with marketing order stats
    //    Count orders where: (a) userId is the customer AND placed by this marketer
    //                        (b) OR any order belonging to this customer
    const customerIds = Object.values(customerMap)
      .filter(c => c.id !== null)
      .map(c => c.id);

    const PENDING_STATUSES = ['order_placed', 'seller_confirmed', 'super_admin_confirmed', 'en_route_to_warehouse', 'at_warehouse', 'processing', 'received_at_warehouse', 'ready_for_pickup', 'in_transit'];

    let orderStats = {};
    if (customerIds.length > 0) {
      // Fetch all marketing orders placed by this marketer for any of these customer userIds
      const marketingOrdersForCustomers = await Order.findAll({
        where: {
          marketerId,
          isMarketingOrder: true,
          userId: { [Op.in]: customerIds }
        },
        attributes: ['userId', 'status']
      });
      marketingOrdersForCustomers.forEach(order => {
        const uid = order.userId;
        if (!orderStats[uid]) orderStats[uid] = { orderCount: 0, hasPendingOrders: false };
        orderStats[uid].orderCount++;
        if (PENDING_STATUSES.includes(order.status)) orderStats[uid].hasPendingOrders = true;
      });

      // Also count any orders where the customer themselves is userId BUT they used the marketer's referral code
      const referralOrders = await Order.findAll({
        where: {
          userId: { [Op.in]: customerIds },
          referralCode: marketerReferralCode,
          marketerId: { [Op.ne]: marketerId } // Avoid double counting orders already found by marketerId
        },
        attributes: ['userId', 'status']
      });
      // Use a Set to avoid double counting orders already counted above
      const countedIds = new Set(marketingOrdersForCustomers.map(o => o.id));
      referralOrders.forEach(order => {
        if (countedIds.has(order.id)) return;
        const uid = order.userId;
        if (!orderStats[uid]) orderStats[uid] = { orderCount: 0, hasPendingOrders: false };
        orderStats[uid].orderCount++;
        if (PENDING_STATUSES.includes(order.status)) orderStats[uid].hasPendingOrders = true;
      });
    }

    const customers = Object.values(customerMap)
      .map(c => ({
        ...c,
        orderCount: c.id ? (orderStats[c.id]?.orderCount || 0) : 0,
        hasPendingOrders: c.id ? (orderStats[c.id]?.hasPendingOrders || false) : false
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, customers });
  } catch (e) {
    console.error('Error fetching my customers:', e);
    res.status(500).json({ error: e.message });
  }
};

const getMarketerPublicDetails = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) return res.status(400).json({ error: 'Referral code is required' });

    const marketer = await User.findOne({
      where: { referralCode: code, role: 'marketer' },
      attributes: ['name'] // Only name is public
    });

    if (!marketer) {
      return res.status(404).json({ error: 'Marketer not found' });
    }

    res.json({ name: marketer.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/marketing/customers/:customerId/orders
// Returns orders for a specific customer that were placed via this marketer
const getCustomerOrders = async (req, res) => {
  try {
    const marketerId = req.user?.id;
    const { customerId } = req.params;

    // Verify this customer is linked to the marketer
    const marketer = await User.findByPk(marketerId, { attributes: ['referralCode'] });
    const marketerReferralCode = marketer?.referralCode;

    const customer = await User.findByPk(customerId, { attributes: ['id', 'referredByReferralCode'] });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Check relationship: either referred by this marketer OR received a marketing order from this marketer
    const isReferred = marketerReferralCode && customer.referredByReferralCode === marketerReferralCode;
    const hasOrderFromMarketer = await Order.findOne({
      where: { marketerId, userId: parseInt(customerId), isMarketingOrder: true }
    });

    if (!isReferred && !hasOrderFromMarketer) {
      return res.status(403).json({ error: 'This customer is not linked to your account' });
    }

    const orders = await Order.findAll({
      where: {
        userId: parseInt(customerId),
        [Op.or]: [
          { marketerId },
          { referralCode: marketerReferralCode }
        ]
      },
      attributes: ['id', 'orderNumber', 'total', 'status', 'createdAt', 'deliveryAddress'],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ success: true, orders });
  } catch (e) {
    console.error('Error fetching customer orders:', e);
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getShareUrl,
  redirectTracker,
  trackShare,
  myStats,
  lookupCustomer,
  getMarketerPublicDetails,
  getMyCustomers,
  getCustomerOrders
};

