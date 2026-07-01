const express = require('express');
console.error('🚀 ANALYTICS ROUTES LOADING...');
const {
  getGeneralOverview,
  getHistoricalTrends,
  getRevenueForecast,
  getSellerPerformanceScores,
  getDeliveryEfficiencyMetrics,
  getMarketingCampaignROI,
  getGrowthPosterData,
  logSiteVisit,
  logItemAction,
  getTrafficStats,
  getConversionFunnel,
  getDeliveryHealth,
  getProductVelocity,
  getBusinessHealthAnalytics,
  getPlatformImpactAnalytics
} = require('../controllers/analytics.controller');
const { getRevenueAnalytics } = require('../../admin/controllers/controller');
const { auth, adminOnly, adminOrFinance } = require('../../../middleware/auth');

const router = express.Router();

// Public routes to log visits and actions
router.post('/log-visit', logSiteVisit);
router.post('/log-action', logItemAction);

// All other analytics routes require admin or finance authorization
router.use(auth);

// Overview stats - admin/finance only
router.get('/overview', adminOrFinance, getGeneralOverview);

// Historical trends - admin/finance only
router.get('/trends/historical', adminOrFinance, getHistoricalTrends);

// Revenue forecasting - admin/finance only
router.get('/revenue/forecast', adminOrFinance, getRevenueForecast);

// Seller performance scoring - admin only
router.get('/sellers/performance', adminOnly, getSellerPerformanceScores);

// Delivery efficiency metrics - admin only
router.get('/delivery/efficiency', adminOnly, getDeliveryEfficiencyMetrics);

// Marketing campaign ROI - admin/finance only
router.get('/marketing/roi', adminOrFinance, getMarketingCampaignROI);

// Growth poster data - admin/finance only
router.get('/growth-poster', adminOrFinance, getGrowthPosterData);

// Conversion funnel analytics - admin/finance only
router.get('/funnel', adminOrFinance, getConversionFunnel);

// Delivery health analytics - admin only
router.get('/delivery/health', adminOnly, getDeliveryHealth);

// Product velocity analytics - admin only
router.get('/product-velocity', adminOnly, getProductVelocity);

// Traffic stats - admin/finance only
router.get('/traffic/stats', adminOrFinance, getTrafficStats);

// Revenue stats - admin/finance only
router.get('/revenue', adminOrFinance, getRevenueAnalytics);

// Business health analytics - admin only
router.get('/business', adminOnly, getBusinessHealthAnalytics);

// Platform growth and impact analytics - admin/finance only
router.get('/impact', adminOrFinance, getPlatformImpactAnalytics);

module.exports = router;
