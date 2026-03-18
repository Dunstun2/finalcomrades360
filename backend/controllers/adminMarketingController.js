const { Op } = require('sequelize');
const { MarketingAnalytics, ReferralTracking, Commission, Product, Category, User, Order, OrderItem } = require('../models/index');

// Helper: parse date range
const getDateRange = (query) => {
  const { from, to } = query || {};
  let where = {};
  if (from || to) {
    where = { [Op.and]: [] };
    if (from) where[Op.and].push({ createdAt: { [Op.gte]: new Date(from) } });
    if (to) where[Op.and].push({ createdAt: { [Op.lte]: new Date(to) } });
  }
  return where;
};

// Build common filters for product/category/platform
const buildFilters = ({ categoryId, productId, platform }) => {
  const filters = {};
  if (productId) filters.productId = Number(productId);
  if (platform) filters.platform = platform;
  // category filter applied after join via Product lookup when needed
  return { filters, categoryId: categoryId ? Number(categoryId) : null };
};

const getSummary = async (req, res) => {
  try {
    const dateWhere = getDateRange(req.query);
    const { filters, categoryId } = buildFilters(req.query);

    // MarketingAnalytics: shares, clicks, views, conversions
    const maWhere = { ...filters, ...dateWhere };
    const actions = await MarketingAnalytics.findAll({ where: maWhere, raw: true });
    const totalShares = actions.filter(a => a.actionType === 'share').length;
    const totalClicks = actions.filter(a => a.actionType === 'click').length;
    const totalViews = actions.filter(a => a.actionType === 'view').length;
    const totalConversions = actions.filter(a => a.actionType === 'conversion').length;

    // Commissions: amounts and status
    const comWhere = {};
    if (req.query.productId) comWhere.productId = Number(req.query.productId);
    if (dateWhere[Op.and]) comWhere.createdAt = { [Op.and]: dateWhere[Op.and].map(c => c.createdAt) };
    const commissions = await Commission.findAll({ where: comWhere, raw: true });

    // Optional category filter by joining Product
    let filteredCommissions = commissions;
    if (categoryId) {
      const productIds = (await Product.findAll({ where: { categoryId }, attributes: ['id'], raw: true })).map(p => p.id);
      filteredCommissions = commissions.filter(c => productIds.includes(c.productId));
    }

    const totalCommissionEarned = filteredCommissions.reduce((s, c) => s + (c.commissionAmount || 0), 0);
    const totalRevenueInfluenced = filteredCommissions.reduce((s, c) => s + (c.saleAmount || 0), 0);
    const statusBuckets = filteredCommissions.reduce((acc, c) => {
      const k = c.status || 'pending';
      acc[k] = (acc[k] || 0) + (c.commissionAmount || 0);
      return acc;
    }, {});

    // Basic platform breakdown
    const platformBreakdown = actions.reduce((acc, a) => {
      const p = a.platform || 'unknown';
      const m = acc[p] || { shares: 0, clicks: 0, views: 0, conversions: 0 };
      if (a.actionType === 'share') m.shares++;
      if (a.actionType === 'click') m.clicks++;
      if (a.actionType === 'view') m.views++;
      if (a.actionType === 'conversion') m.conversions++;
      acc[p] = m;
      return acc;
    }, {});

    // Compute derived KPIs
    const ctr = totalShares ? (totalClicks / totalShares) : 0;
    const cvr = totalClicks ? (totalConversions / totalClicks) : 0;
    const epc = totalClicks ? (totalCommissionEarned / totalClicks) : 0;
    const aov = totalConversions ? (totalRevenueInfluenced / totalConversions) : 0;

    return res.json({
      totalShares,
      totalClicks,
      totalViews,
      totalConversions,
      totalCommissionEarned,
      totalRevenueInfluenced,
      commissionByStatus: statusBuckets,
      platformBreakdown,
      ctr,
      cvr,
      epc,
      aov
    });
  } catch (err) {
    console.error('Admin getSummary error:', err);
    return res.status(500).json({ message: 'Failed to load admin marketing summary' });
  }
};

const getMarketersLeaderboard = async (req, res) => {
  try {
    const { from, to, sortBy = 'commission', limit = 20 } = req.query;
    const dateWhere = getDateRange({ from, to });

    // Commission aggregation per marketer
    const commissions = await Commission.findAll({ where: dateWhere, raw: true });
    const byMarketer = new Map();
    for (const c of commissions) {
      const m = byMarketer.get(c.marketerId) || { marketerId: c.marketerId, commission: 0, revenue: 0, conversions: 0 };
      m.commission += (c.commissionAmount || 0);
      m.revenue += (c.saleAmount || 0);
      m.conversions += 1;
      byMarketer.set(c.marketerId, m);
    }

    // Clicks from MarketingAnalytics
    const clicks = await MarketingAnalytics.findAll({ where: { actionType: 'click', ...dateWhere }, raw: true });
    for (const a of clicks) {
      const m = byMarketer.get(a.marketerId) || { marketerId: a.marketerId, commission: 0, revenue: 0, conversions: 0 };
      m.clicks = (m.clicks || 0) + 1;
      byMarketer.set(a.marketerId, m);
    }

    // Shares for CTR/EPC
    const shares = await MarketingAnalytics.findAll({ where: { actionType: 'share', ...dateWhere }, raw: true });
    for (const a of shares) {
      const m = byMarketer.get(a.marketerId) || { marketerId: a.marketerId, commission: 0, revenue: 0, conversions: 0 };
      m.shares = (m.shares || 0) + 1;
      byMarketer.set(a.marketerId, m);
    }

    const list = Array.from(byMarketer.values()).map(m => ({
      ...m,
      ctr: (m.shares ? (m.clicks || 0) / m.shares : 0),
      cvr: (m.clicks ? (m.conversions || 0) / m.clicks : 0),
      epc: (m.clicks ? (m.commission || 0) / m.clicks : 0),
    }));

    const sorters = {
      commission: (a,b)=> (b.commission||0)-(a.commission||0),
      revenue: (a,b)=> (b.revenue||0)-(a.revenue||0),
      conversions: (a,b)=> (b.conversions||0)-(a.conversions||0),
      clicks: (a,b)=> (b.clicks||0)-(a.clicks||0),
      ctr: (a,b)=> (b.ctr||0)-(a.ctr||0),
      cvr: (a,b)=> (b.cvr||0)-(a.cvr||0),
      epc: (a,b)=> (b.epc||0)-(a.epc||0),
    };
    const sorter = sorters[sortBy] || sorters.commission;
    list.sort(sorter);

    // Attach basic marketer info
    const ids = list.map(x => x.marketerId).filter(Boolean);
    const users = await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id','name','email'], raw: true });
    const byId = new Map(users.map(u => [u.id, u]));
    const withUsers = list.map(x => ({ ...x, user: byId.get(x.marketerId) || null }));

    return res.json({ items: withUsers.slice(0, Number(limit) || 20) });
  } catch (err) {
    console.error('Admin getMarketersLeaderboard error:', err);
    return res.status(500).json({ message: 'Failed to load marketers leaderboard' });
  }
};

const getMarketerProfile = async (req, res) => {
  try {
    const marketerId = Number(req.params.id);
    const dateWhere = getDateRange(req.query);

    // KPIs from commissions
    const commissions = await Commission.findAll({ where: { marketerId, ...dateWhere }, raw: true });
    const totalCommission = commissions.reduce((s,c)=> s + (c.commissionAmount||0), 0);
    const totalRevenue = commissions.reduce((s,c)=> s + (c.saleAmount||0), 0);

    // Actions
    const actions = await MarketingAnalytics.findAll({ where: { marketerId, ...dateWhere }, raw: true });
    const totalShares = actions.filter(a=>a.actionType==='share').length;
    const totalClicks = actions.filter(a=>a.actionType==='click').length;
    const totalConversions = commissions.length; // conservative: confirmed by commission records

    // Product breakdown
    const byProduct = {};
    for (const c of commissions) {
      const p = byProduct[c.productId] || { productId: c.productId, revenue: 0, commission: 0, conversions: 0 };
      p.revenue += (c.saleAmount||0);
      p.commission += (c.commissionAmount||0);
      p.conversions += 1;
      byProduct[c.productId] = p;
    }

    // add clicks/shares per product
    for (const a of actions) {
      const p = byProduct[a.productId] || { productId: a.productId, revenue: 0, commission: 0, conversions: 0 };
      if (a.actionType === 'click') p.clicks = (p.clicks||0) + 1;
      if (a.actionType === 'share') p.shares = (p.shares||0) + 1;
      byProduct[a.productId] = p;
    }

    // Attach product meta
    const productIds = Object.keys(byProduct).map(Number).filter(Boolean);
    const products = await Product.findAll({ where: { id: { [Op.in]: productIds } }, attributes: ['id','name','categoryId'], raw: true });
    const cats = await Category.findAll({ attributes: ['id','name'], raw: true });
    const catById = new Map(cats.map(c=>[c.id, c.name]));
    const items = productIds.map(pid => {
      const row = byProduct[pid];
      const prod = products.find(p=>p.id===pid) || {};
      const ctr = row.shares ? (row.clicks||0)/row.shares : 0;
      const cvr = row.clicks ? (row.conversions||0)/row.clicks : 0;
      return { ...row, productName: prod.name || `Product #${pid}` , categoryName: catById.get(prod.categoryId) || 'Uncategorized', ctr, cvr };
    });

    const ctr = totalShares ? (totalClicks / totalShares) : 0;
    const cvr = totalClicks ? (totalConversions / totalClicks) : 0;
    const epc = totalClicks ? (totalCommission / totalClicks) : 0;

    return res.json({
      marketerId,
      kpis: { totalShares, totalClicks, totalConversions, totalRevenue, totalCommission, ctr, cvr, epc },
      productPerformance: items,
    });
  } catch (err) {
    console.error('Admin getMarketerProfile error:', err);
    return res.status(500).json({ message: 'Failed to load marketer profile' });
  }
};

module.exports = {
  getSummary,
  getMarketersLeaderboard,
  getMarketerProfile
};
