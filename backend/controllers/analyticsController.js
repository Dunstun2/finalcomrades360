const { Order, OrderItem, Product, User, Payment, DeliveryTask, Commission, SiteVisit, ProductView, MarketingAnalytics, ReturnRequest, sequelize } = require('../models');
console.error('🚀 ANALYTICS CONTROLLER LOADING...');
const { Op, fn, col, literal } = require('sequelize');

const parseDateOnlyUtc = (dateString, endOfDay = false) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0));
};

/**
 * Analytics Controller
 * Provides historical trends, revenue forecasting, seller scoring, delivery metrics, and marketing ROI
 */

// Historical Trend Analysis
const getHistoricalTrends = async (req, res) => {
  try {
    const { startDate, endDate, interval = 'day' } = req.query;
    
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();

    // Determine date grouping based on interval
    let dateFormat;
    if (sequelize.options.dialect === 'sqlite') {
      dateFormat = interval === 'month' 
        ? "strftime('%Y-%m', createdAt)"
        : "strftime('%Y-%m-%d', createdAt)";
    } else {
      dateFormat = interval === 'month'
        ? "DATE_FORMAT(createdAt, '%Y-%m')"
        : "DATE(createdAt)";
    }

    // Orders trend
    const ordersTrend = await Order.findAll({
      attributes: [
        [literal(dateFormat), 'date'],
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('total')), 'revenue']
      ],
      where: {
        createdAt: { [Op.between]: [start, end] }
      },
      group: [literal(dateFormat)],
      order: [[literal(dateFormat), 'ASC']],
      raw: true
    });

    // New users trend
    const usersTrend = await User.findAll({
      attributes: [
        [literal(dateFormat), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.between]: [start, end] }
      },
      group: [literal(dateFormat)],
      order: [[literal(dateFormat), 'ASC']],
      raw: true
    });

    // Product views trend (if tracking)
    const productsAdded = await Product.findAll({
      attributes: [
        [literal(dateFormat), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.between]: [start, end] }
      },
      group: [literal(dateFormat)],
      order: [[literal(dateFormat), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      interval,
      dateRange: { start, end },
      trends: {
        orders: ordersTrend,
        users: usersTrend,
        products: productsAdded
      }
    });
  } catch (error) {
    console.error('Error fetching historical trends:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trends', error: error.message });
  }
};

// Revenue Forecasting
const getRevenueForecast = async (req, res) => {
  try {
    const { months = 3 } = req.query;
    
    // Get last 6 months of revenue data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historicalRevenue = await Order.findAll({
      attributes: [
        [fn('YEAR', col('createdAt')), 'year'],
        [fn('MONTH', col('createdAt')), 'month'],
        [fn('SUM', col('total')), 'revenue'],
        [fn('COUNT', col('OrderItem.id')), 'orderCount']
      ],
      where: {
        createdAt: { [Op.gte]: sixMonthsAgo },
        status: { [Op.in]: ['completed', 'delivered'] }
      },
      group: [fn('YEAR', col('createdAt')), fn('MONTH', col('createdAt'))],
      order: [[fn('YEAR', col('createdAt')), 'ASC'], [fn('MONTH', col('createdAt')), 'ASC']],
      raw: true
    });

    // Simple linear regression forecast
    const revenues = historicalRevenue.map(r => parseFloat(r.revenue) || 0);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    
    // Calculate growth rate
    const recentRevenues = revenues.slice(-3);
    const olderRevenues = revenues.slice(0, 3);
    const recentAvg = recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length;
    const olderAvg = olderRevenues.reduce((a, b) => a + b, 0) / olderRevenues.length;
    const growthRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

    // Generate forecast
    const forecast = [];
    const currentDate = new Date();
    for (let i = 1; i <= parseInt(months); i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      const predictedRevenue = avgRevenue * (1 + growthRate * i);
      forecast.push({
        year: forecastDate.getFullYear(),
        month: forecastDate.getMonth() + 1,
        predictedRevenue: Math.round(predictedRevenue),
        confidence: Math.max(0.5, 1 - (i * 0.1)) // Confidence decreases with time
      });
    }

    res.json({
      success: true,
      historical: historicalRevenue,
      growthRate: (growthRate * 100).toFixed(2) + '%',
      forecast
    });
  } catch (error) {
    console.error('Error generating revenue forecast:', error);
    res.status(500).json({ success: false, message: 'Failed to generate forecast', error: error.message });
  }
};

// Seller Performance Scoring
const getSellerPerformanceScores = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const isSqlite = sequelize.getDialect() === 'sqlite';

    const sellers = await User.findAll({
      where: {
        [Op.or]: isSqlite ? [
          { role: 'seller' },
          { roles: { [Op.like]: '%"seller"%' } }
        ] : [
          { role: 'seller' },
          sequelize.where(
            sequelize.fn('JSON_CONTAINS', sequelize.col('roles'), sequelize.fn('JSON_QUOTE', 'seller')),
            1
          )
        ]
      },
      attributes: ['id', 'name', 'email', 'createdAt'],
      limit: parseInt(limit)
    });

    const performanceScores = await Promise.all(sellers.map(async (seller) => {
      // Get seller stats
      const orders = await Order.count({ where: { sellerId: seller.id } });
      const completedOrders = await Order.count({ 
        where: { sellerId: seller.id, status: 'completed' } 
      });
      const revenue = await Order.sum('total', { 
        where: { sellerId: seller.id, status: { [Op.in]: ['completed', 'delivered'] } } 
      }) || 0;
      
      const products = await Product.count({ where: { sellerId: seller.id } });
      const activeProducts = await Product.count({ 
        where: { sellerId: seller.id, approved: true } 
      });
      
      // Calculate average delivery time
      const avgDeliveryTime = await Order.findAll({
        where: { 
          sellerId: seller.id, 
          status: 'delivered',
          actualDelivery: { [Op.ne]: null }
        },
        attributes: [[
          fn('AVG', 
            literal("JULIANDAY(actualDelivery) - JULIANDAY(createdAt)")
          ), 
          'avgDays'
        ]],
        raw: true
      });

      // Calculate performance score (0-100)
      const completionRate = orders > 0 ? (completedOrders / orders) * 100 : 0;
      const productApprovalRate = products > 0 ? (activeProducts / products) * 100 : 0;
      const revenueScore = Math.min((revenue / 100000) * 100, 100); // Max score at 100k
      const deliveryDays = parseFloat(avgDeliveryTime[0]?.avgDays) || 0;
      const deliveryScore = deliveryDays > 0 ? Math.max(0, 100 - (deliveryDays * 5)) : 50;

      const overallScore = (
        completionRate * 0.3 +
        productApprovalRate * 0.2 +
        revenueScore * 0.3 +
        deliveryScore * 0.2
      ).toFixed(2);

      return {
        sellerId: seller.id,
        sellerName: seller.name,
        email: seller.email,
        stats: {
          totalOrders: orders,
          completedOrders,
          revenue: parseFloat(revenue).toFixed(2),
          totalProducts: products,
          activeProducts,
          avgDeliveryDays: deliveryDays.toFixed(1)
        },
        scores: {
          completionRate: completionRate.toFixed(2),
          productApprovalRate: productApprovalRate.toFixed(2),
          revenueScore: revenueScore.toFixed(2),
          deliveryScore: deliveryScore.toFixed(2),
          overallScore
        },
        rating: overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Needs Improvement'
      };
    }));

    performanceScores.sort((a, b) => parseFloat(b.scores.overallScore) - parseFloat(a.scores.overallScore));

    res.json({
      success: true,
      sellers: performanceScores
    });
  } catch (error) {
    console.error('Error calculating seller performance:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate performance', error: error.message });
  }
};

// Delivery Efficiency Metrics
const getDeliveryEfficiencyMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();

    // Overall delivery stats
    const totalDeliveries = await DeliveryTask.count({
      where: {
        createdAt: { [Op.between]: [start, end] },
        status: { [Op.in]: ['completed', 'delivered'] }
      }
    });

    const onTimeDeliveries = await DeliveryTask.count({
      where: {
        createdAt: { [Op.between]: [start, end] },
        status: { [Op.in]: ['completed', 'delivered'] },
        completedAt: { [Op.lte]: col('estimatedDelivery') }
      }
    });

    // Average delivery time
    const avgDeliveryTime = await DeliveryTask.findAll({
      where: {
        createdAt: { [Op.between]: [start, end] },
        status: { [Op.in]: ['completed', 'delivered'] },
        completedAt: { [Op.ne]: null }
      },
      attributes: [[
        fn('AVG', 
          literal("ROUND((JULIANDAY(completedAt) - JULIANDAY(assignedAt)) * 24, 2)")
        ), 
        'avgHours'
      ]],
      raw: true
    });

    // Delivery agent performance
    const agentPerformance = await DeliveryTask.findAll({
      where: {
        createdAt: { [Op.between]: [start, end] },
        deliveryAgentId: { [Op.ne]: null }
      },
      attributes: [
        'deliveryAgentId',
        [fn('COUNT', col('id')), 'totalDeliveries'],
        [fn('SUM', literal("CASE WHEN status IN ('completed', 'delivered') THEN 1 ELSE 0 END")), 'completed'],
        [fn('AVG', literal("CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END")), 'avgRating']
      ],
      group: ['deliveryAgentId'],
      include: [{
        model: User,
        as: 'deliveryAgent',
        attributes: ['name', 'email', 'businessName']
      }],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 20
    });

    // Failed deliveries analysis
    const failedDeliveries = await DeliveryTask.count({
      where: {
        createdAt: { [Op.between]: [start, end] },
        status: 'failed'
      }
    });

    res.json({
      success: true,
      dateRange: { start, end },
      metrics: {
        totalDeliveries,
        onTimeDeliveries,
        onTimeRate: totalDeliveries > 0 ? ((onTimeDeliveries / totalDeliveries) * 100).toFixed(2) + '%' : 'N/A',
        avgDeliveryTimeHours: parseFloat(avgDeliveryTime[0]?.avgHours || 0).toFixed(2),
        failedDeliveries,
        failureRate: totalDeliveries > 0 ? ((failedDeliveries / totalDeliveries) * 100).toFixed(2) + '%' : 'N/A'
      },
      agentPerformance: agentPerformance.map(a => ({
        agentId: a.deliveryAgentId,
        agentName: a.deliveryAgent?.name,
        totalDeliveries: a.dataValues.totalDeliveries,
        completed: a.dataValues.completed,
        completionRate: ((a.dataValues.completed / a.dataValues.totalDeliveries) * 100).toFixed(2) + '%',
        avgRating: parseFloat(a.dataValues.avgRating || 0).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('Error fetching delivery metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery metrics', error: error.message });
  }
};

// Marketing Campaign ROI Tracking
const getMarketingCampaignROI = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();

    const isSqlite = sequelize.getDialect() === 'sqlite';

    // Get all marketers with their referral codes
    const marketers = await User.findAll({
      where: {
        [Op.or]: isSqlite ? [
          { role: 'marketer' },
          { roles: { [Op.like]: '%"marketer"%' } }
        ] : [
          { role: 'marketer' },
          sequelize.where(
            sequelize.fn('JSON_CONTAINS', sequelize.col('roles'), sequelize.fn('JSON_QUOTE', 'marketer')),
            1
          )
        ],
        referralCode: { [Op.ne]: null }
      },
      attributes: ['id', 'name', 'email', 'referralCode']
    });

    const campaignROI = await Promise.all(marketers.map(async (marketer) => {
      // Orders through this marketer's referral code
      const orders = await Order.findAll({
        where: {
          [Op.or]: [
            { primaryReferralCode: marketer.referralCode },
            { secondaryReferralCode: marketer.referralCode }
          ],
          createdAt: { [Op.between]: [start, end] }
        },
        attributes: [
          [fn('COUNT', col('OrderItem.id')), 'orderCount'],
          [fn('SUM', col('total')), 'totalRevenue']
        ],
        raw: true
      });

      // Commissions earned
      const commissions = await Commission.findAll({
        where: {
          marketerId: marketer.id,
          createdAt: { [Op.between]: [start, end] }
        },
        attributes: [
          [fn('SUM', col('amount')), 'totalCommission'],
          [fn('SUM', literal("CASE WHEN status = 'paid' THEN amount ELSE 0 END")), 'paidCommission']
        ],
        raw: true
      });

      // New users referred
      const referredUsers = await User.count({
        where: {
          referredByReferralCode: marketer.referralCode,
          createdAt: { [Op.between]: [start, end] }
        }
      });

      const orderCount = parseInt(orders[0]?.orderCount) || 0;
      const revenue = parseFloat(orders[0]?.totalRevenue) || 0;
      const totalCommission = parseFloat(commissions[0]?.totalCommission) || 0;
      const paidCommission = parseFloat(commissions[0]?.paidCommission) || 0;

      // Calculate ROI (Revenue generated vs Commission paid)
      const roi = totalCommission > 0 ? ((revenue - totalCommission) / totalCommission * 100) : 0;

      return {
        marketerId: marketer.id,
        marketerName: marketer.name,
        referralCode: marketer.referralCode,
        performance: {
          ordersGenerated: orderCount,
          revenueGenerated: revenue.toFixed(2),
          newCustomersReferred: referredUsers,
          totalCommissionEarned: totalCommission.toFixed(2),
          paidCommission: paidCommission.toFixed(2),
          pendingCommission: (totalCommission - paidCommission).toFixed(2)
        },
        metrics: {
          roi: roi.toFixed(2) + '%',
          avgOrderValue: orderCount > 0 ? (revenue / orderCount).toFixed(2) : '0',
          conversionRate: referredUsers > 0 ? ((orderCount / referredUsers) * 100).toFixed(2) + '%' : 'N/A'
        }
      };
    }));

    // Sort by revenue generated
    campaignROI.sort((a, b) => parseFloat(b.performance.revenueGenerated) - parseFloat(a.performance.revenueGenerated));

    res.json({
      success: true,
      dateRange: { start, end },
      campaigns: campaignROI,
      summary: {
        totalMarketers: campaignROI.length,
        totalRevenue: campaignROI.reduce((sum, c) => sum + parseFloat(c.performance.revenueGenerated), 0).toFixed(2),
        totalCommissionPaid: campaignROI.reduce((sum, c) => sum + parseFloat(c.performance.paidCommission), 0).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error calculating marketing ROI:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate ROI', error: error.message });
  }
};

// General Platform Overview Stats
const getGeneralOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate the duration of the current period to get the previous period
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime() - 1); // 1ms before current period start

    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      totalProducts,
      // Current Period Stats
      periodOrders,
      periodRevenue,
      periodNewUsers,
      periodActiveSessions,
      // Previous Period Stats (for growth)
      prevPeriodOrders,
      prevPeriodRevenue,
      prevPeriodNewUsers,
      prevPeriodActiveSessions
    ] = await Promise.all([
      User.count(),
      Order.count({ where: { status: { [Op.in]: ['completed', 'delivered'] } } }),
      Order.sum('total', { where: { status: { [Op.in]: ['completed', 'delivered'] } } }),
      Product.count(),
      
      // Current
      Order.count({ where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.in]: ['completed', 'delivered'] } } }),
      Order.sum('total', { where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.in]: ['completed', 'delivered'] } } }),
      User.count({ where: { createdAt: { [Op.between]: [start, end] } } }),
      SiteVisit.count({ distinct: true, col: 'sessionId', where: { createdAt: { [Op.between]: [start, end] } } }),

      // Previous
      Order.count({ where: { createdAt: { [Op.between]: [prevStart, prevEnd] }, status: { [Op.in]: ['completed', 'delivered'] } } }),
      Order.sum('total', { where: { createdAt: { [Op.between]: [prevStart, prevEnd] }, status: { [Op.in]: ['completed', 'delivered'] } } }),
      User.count({ where: { createdAt: { [Op.between]: [prevStart, prevEnd] } } }),
      SiteVisit.count({ distinct: true, col: 'sessionId', where: { createdAt: { [Op.between]: [prevStart, prevEnd] } } })
    ]);

    const calculateGrowth = (current, previous) => {
      current = Number(current || 0);
      previous = Number(previous || 0);
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat(((current - previous) / previous * 100).toFixed(2));
    };

    const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0;
    const periodConversionRate = periodActiveSessions > 0 ? (periodOrders / periodActiveSessions) * 100 : 0;
    const prevPeriodConversionRate = prevPeriodActiveSessions > 0 ? (prevPeriodOrders / prevPeriodActiveSessions) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: parseFloat(totalRevenue || 0),
        totalProducts,
        activeUsers: periodActiveSessions, // More accurate active users (visitors)
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        
        // Detailed Period Metrics
        period: {
          start,
          end,
          orders: periodOrders,
          revenue: parseFloat(periodRevenue || 0),
          newUsers: periodNewUsers,
          activeUsers: periodActiveSessions,
          conversionRate: parseFloat(periodConversionRate.toFixed(2))
        },
        
        // Growth comparison
        growth: {
          orders: calculateGrowth(periodOrders, prevPeriodOrders),
          revenue: calculateGrowth(periodRevenue, prevPeriodRevenue),
          users: calculateGrowth(periodNewUsers, prevPeriodNewUsers),
          activeUsers: calculateGrowth(periodActiveSessions, prevPeriodActiveSessions),
          conversionRate: calculateGrowth(periodConversionRate, prevPeriodConversionRate)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching general overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overview stats', error: error.message });
  }
};

// Growth Poster Data
const getGrowthPosterData = async (req, res) => {
  try {
    const { period = 'day', date } = req.query;
    
    let start, end;
    const selectedDate = date ? parseDateOnlyUtc(date, false) : new Date();

    if (period === 'day') {
      start = parseDateOnlyUtc(date, false) || new Date(selectedDate);
      end = parseDateOnlyUtc(date, true) || new Date(selectedDate);
    } else if (period === 'month') {
      const year = selectedDate.getUTCFullYear();
      const month = selectedDate.getUTCMonth();
      start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    } else if (period === 'year') {
      const year = selectedDate.getUTCFullYear();
      start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    }

    const isSqlite = sequelize.getDialect() === 'sqlite';

    const getRoleCount = (roleName) => {
      const whereClause = {
        createdAt: { [Op.between]: [start, end] }
      };

      if (roleName === 'customer') {
        whereClause.role = 'customer';
      } else {
        whereClause[Op.or] = isSqlite ? [
          { role: roleName },
          { roles: { [Op.like]: `%"${roleName}"%` } }
        ] : [
          { role: roleName },
          sequelize.where(sequelize.fn('JSON_CONTAINS', sequelize.col('roles'), sequelize.fn('JSON_QUOTE', roleName)), 1)
        ];
      }

      return User.count({ where: whereClause });
    };

    const [
      totalUsers,
      marketers,
      deliveryAgents,
      sellers,
      serviceProviders,
      customers,
      totalOrders,
      successfulOrders
    ] = await Promise.all([
      User.count({ where: { createdAt: { [Op.between]: [start, end] } } }),
      getRoleCount('marketer'),
      getRoleCount('delivery_agent'),
      getRoleCount('seller'),
      getRoleCount('service_provider'),
      getRoleCount('customer'),
      Order.count({ where: { createdAt: { [Op.between]: [start, end] } } }),
      Order.count({ 
        where: { 
          createdAt: { [Op.between]: [start, end] },
          status: { [Op.in]: ['completed', 'delivered'] }
        } 
      })
    ]);

    res.json({
      success: true,
      period,
      date,
      range: { start, end },
      data: {
        newUsers: totalUsers,
        roles: {
          marketers,
          deliveryAgents,
          sellers,
          serviceProviders,
          customers
        },
        orders: {
          total: totalOrders,
          successful: successfulOrders,
          successRate: totalOrders > 0 ? parseFloat(((successfulOrders / totalOrders) * 100).toFixed(2)) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching growth poster data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch growth data', error: error.message });
  }
};

// Log Site Visit
const logSiteVisit = async (req, res) => {
  try {
    const { path, sessionId, userId, deviceType, browser, os, referrer } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Check if this session has visited this path recently to avoid double counting for "unique" in session
    const existingVisit = await SiteVisit.findOne({
      where: { sessionId, path }
    });

    await SiteVisit.create({
      userId: userId || null,
      ipAddress,
      userAgent: req.headers['user-agent'],
      path,
      referrer,
      sessionId,
      deviceType,
      browser,
      os,
      isUnique: !existingVisit
    });

    // Auto-detect item views from path
    if (path.startsWith('/product/') || path.startsWith('/fastfood/') || path.startsWith('/service/')) {
      const parts = path.split('/');
      const itemId = Number(parts[parts.length - 1]);
      let itemType = 'product';
      if (path.startsWith('/fastfood/')) itemType = 'fastfood';
      if (path.startsWith('/service/')) itemType = 'service';

      if (itemId && !isNaN(itemId)) {
        // Log to ProductView asynchronously
        ProductView.create({
          productId: itemType === 'product' ? itemId : null,
          fastFoodId: itemType === 'fastfood' ? itemId : null,
          serviceId: itemType === 'service' ? itemId : null,
          userId: userId || null,
          ipAddress,
          userAgent: req.headers['user-agent'],
          sessionId,
          deviceType,
          referralSource: referrer ? (referrer.includes('facebook') ? 'facebook' : referrer.includes('twitter') ? 'twitter' : 'direct') : 'direct'
        }).catch(err => console.error('Error auto-logging item view:', err.message));
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging site visit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Log specific item actions (click, share)
const logItemAction = async (req, res) => {
  try {
    const { itemId, itemType, actionType, platform = 'direct', sessionId, userId, metadata = {} } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const deviceType = /Mobile|Android|iPhone/i.test(userAgent) ? 'mobile' : 'desktop';

    await MarketingAnalytics.create({
      productId: itemType === 'product' ? itemId : null,
      fastFoodId: itemType === 'fastfood' ? itemId : null,
      serviceId: itemType === 'service' ? itemId : null,
      actionType, // 'click', 'share', 'conversion'
      platform,
      userId: userId || null,
      ipAddress,
      userAgent,
      deviceType,
      sessionId,
      metadata: {
        ...metadata,
        sessionId,
        timestamp: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging item action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Traffic Stats
const getTrafficStats = async (req, res) => {
  try {
    const { period = 'day', startDate, endDate } = req.query;
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();
    const isSqlite = sequelize.getDialect() === 'sqlite';

    let dateFormat;
    if (isSqlite) {
      dateFormat = period === 'month' ? "strftime('%Y-%m', createdAt)" : period === 'year' ? "strftime('%Y', createdAt)" : "strftime('%Y-%m-%d', createdAt)";
    } else {
      dateFormat = period === 'month' ? "%Y-%m" : period === 'year' ? "%Y" : "%Y-%m-%d";
    }

    const [trafficTrend, topPages, deviceStats, totalOrders, totalUniqueVisitors, totalVisits] = await Promise.all([
      SiteVisit.findAll({
        attributes: [
          [isSqlite ? literal(dateFormat) : fn('DATE_FORMAT', col('createdAt'), dateFormat), 'date'],
          [fn('COUNT', col('id')), 'visits'],
          [fn('COUNT', literal('DISTINCT sessionId')), 'uniqueVisitors']
        ],
        where: { createdAt: { [Op.between]: [start, end] } },
        group: [isSqlite ? literal(dateFormat) : fn('DATE_FORMAT', col('createdAt'), dateFormat)],
        order: [[isSqlite ? literal(dateFormat) : fn('DATE_FORMAT', col('createdAt'), dateFormat), 'ASC']],
        raw: true
      }),
      SiteVisit.findAll({
        attributes: [
          'path',
          [fn('COUNT', col('id')), 'visits'],
          [fn('COUNT', literal('DISTINCT sessionId')), 'uniqueVisitors']
        ],
        where: { createdAt: { [Op.between]: [start, end] } },
        group: ['path'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 10,
        raw: true
      }),
      SiteVisit.findAll({
        attributes: [
          'deviceType',
          [fn('COUNT', col('id')), 'count']
        ],
        where: { createdAt: { [Op.between]: [start, end] } },
        group: ['deviceType'],
        raw: true
      }),
      Order.count({
        where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.in]: ['completed', 'delivered'] } }
      }),
      SiteVisit.count({
        distinct: true,
        col: 'sessionId',
        where: { createdAt: { [Op.between]: [start, end] } }
      }),
      SiteVisit.count({
        where: { createdAt: { [Op.between]: [start, end] } }
      })
    ]);

    res.json({
      success: true,
      trends: trafficTrend,
      topPages,
      deviceStats,
      summary: {
        totalVisits: parseInt(totalVisits || 0),
        totalUniqueVisitors: parseInt(totalUniqueVisitors || 0),
        totalOrders
      }
    });
  } catch (error) {
    console.error('Error fetching traffic stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch traffic stats', error: error.message });
  }
};

// Get High-End Business Health Analytics (Shopify/Amazon Style)
const getBusinessHealthAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const isSqlite = sequelize.getDialect() === 'sqlite';

    // 1. Run core queries in parallel
    const [
      financials,
      categoryDistribution,
      topVendorsRaw,
      retentionRaw,
      operationalRaw,
      cancellationStats
    ] = await Promise.all([
      // Financials
      Order.findOne({
        where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.in]: ['completed', 'delivered'] } },
        attributes: [
          [fn('SUM', col('total')), 'gmv'],
          [fn('COUNT', col('Order.id')), 'totalOrders'],
          [fn('AVG', col('total')), 'aov']
        ],
        raw: true
      }),
      // Revenue Mix by Category Type
      OrderItem.findAll({
        where: { createdAt: { [Op.between]: [start, end] } },
        include: [{ 
          model: Order, 
          where: { status: { [Op.in]: ['completed', 'delivered'] } },
          attributes: [] // We only need the filter
        }],
        attributes: [
          'itemType',
          [fn('SUM', col('OrderItem.total')), 'revenue'],
          [fn('COUNT', col('OrderItem.id')), 'itemCount']
        ],
        group: ['itemType'],
        raw: true
      }),
      // Vendor Performance Matrix
      OrderItem.findAll({
        where: { createdAt: { [Op.between]: [start, end] } },
        include: [
          { 
            model: Order, 
            where: { status: { [Op.in]: ['completed', 'delivered'] } },
            attributes: [] 
          },
          { 
            model: User, 
            as: 'seller', 
            attributes: ['id', 'name', 'businessName'] 
          }
        ],
        attributes: [
          'OrderItem.sellerId',
          [fn('SUM', col('OrderItem.total')), 'revenue'],
          [fn('COUNT', col('OrderItem.id')), 'orderCount'],
          [fn('SUM', col('quantity')), 'unitsSold']
        ],
        group: ['OrderItem.sellerId', 'seller.id', 'seller.name', 'seller.businessName'],
        order: [[literal('revenue'), 'DESC']],
        limit: 10,
        raw: false
      }),
      // Customer Retention Stats
      Order.findAll({
        where: { createdAt: { [Op.between]: [start, end] } },
        attributes: ['userId'],
        raw: true
      }),
      // Operational Performance
      DeliveryTask.findAll({
        where: { 
          createdAt: { [Op.between]: [start, end] }, 
          status: { [Op.in]: ['completed', 'delivered'] },
          completedAt: { [Op.ne]: null },
          assignedAt: { [Op.ne]: null }
        },
        attributes: ['assignedAt', 'completedAt'],
        raw: true
      }),
      // Cancellations
      Order.count({
        where: { createdAt: { [Op.between]: [start, end] }, status: 'cancelled' }
      })
    ]);

    // 2. Post-process Retention (Identify Returning Customers)
    const uniqueUserIds = [...new Set(retentionRaw.map(o => o.userId))];
    let returningCustomersCount = 0;
    if (uniqueUserIds.length > 0) {
      const returningBuyers = await Order.findAll({
        attributes: ['userId', [fn('COUNT', col('Order.id')), 'prevCount']],
        where: {
          userId: { [Op.in]: uniqueUserIds },
          createdAt: { [Op.lt]: start } // Orders before this period
        },
        group: ['userId'],
        raw: true
      });
      returningCustomersCount = returningBuyers.length;
    }

    // 3. Post-process Operational Metrics
    let totalHours = 0;
    operationalRaw.forEach(task => {
      const diff = new Date(task.completedAt) - new Date(task.assignedAt);
      totalHours += (diff / (1000 * 60 * 60));
    });
    const avgFulfillmentHours = operationalRaw.length > 0 ? (totalHours / operationalRaw.length) : 0;

    // 4. Final Aggregation
    const gmv = parseFloat(financials?.gmv || 0);
    const orderCount = parseInt(financials?.totalOrders || 0);
    const aov = orderCount > 0 ? gmv / orderCount : 0;
    const rcr = uniqueUserIds.length > 0 ? (returningCustomersCount / uniqueUserIds.length) * 100 : 0;
    const cancellationRate = (orderCount + cancellationStats) > 0 ? (cancellationStats / (orderCount + cancellationStats)) * 100 : 0;

    res.json({
      success: true,
      data: {
        financials: {
          gmv: Number(gmv.toFixed(2)),
          orders: orderCount,
          aov: Number(aov.toFixed(2)),
          revenueMix: categoryDistribution.map(c => ({
            type: c.itemType,
            revenue: parseFloat(c.revenue || 0),
            share: gmv > 0 ? ((parseFloat(c.revenue || 0) / gmv) * 100).toFixed(1) : 0
          }))
        },
        retention: {
          totalUniqueBuyers: uniqueUserIds.length,
          returningBuyers: returningCustomersCount,
          returningCustomerRate: Number(rcr.toFixed(2))
        },
        operations: {
          avgFulfillmentHours: Number(avgFulfillmentHours.toFixed(2)),
          cancellationRate: Number(cancellationRate.toFixed(2)),
          totalCancellations: cancellationStats
        },
        vendors: topVendorsRaw.map(v => ({
          id: v.dataValues.sellerId ?? v.seller?.id,
          name: v.seller?.businessName || v.seller?.name || 'Unknown',
          revenue: parseFloat(v.dataValues.revenue || 0),
          orders: parseInt(v.dataValues.orderCount || 0),
          unitsSold: parseInt(v.dataValues.unitsSold || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching business health analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch business analytics', error: error.message });
  }
};

// Conversion funnel analytics
const getConversionFunnel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();

    const [visitCount, productViewCount, addToCartCount, clickCount, completedOrdersCount, totalOrdersCount] = await Promise.all([
      SiteVisit.count({ where: { createdAt: { [Op.between]: [start, end] } } }),
      ProductView.count({ where: { createdAt: { [Op.between]: [start, end] } } }),
      MarketingAnalytics.count({ where: { actionType: 'conversion', createdAt: { [Op.between]: [start, end] } } }),
      MarketingAnalytics.count({ where: { actionType: 'click', createdAt: { [Op.between]: [start, end] } } }),
      Order.count({ where: { createdAt: { [Op.between]: [start, end] }, status: { [Op.in]: ['completed', 'delivered'] } } }),
      Order.count({ where: { createdAt: { [Op.between]: [start, end] } } })
    ]);

    const addToCartRate = visitCount > 0 ? (addToCartCount / visitCount) * 100 : 0;
    const orderConversionRate = addToCartCount > 0 ? (completedOrdersCount / addToCartCount) * 100 : 0;
    const visitToOrderRate = visitCount > 0 ? (completedOrdersCount / visitCount) * 100 : 0;

    res.json({
      success: true,
      dateRange: { start, end },
      funnel: [
        { stage: 'visits', count: visitCount },
        { stage: 'product_views', count: productViewCount },
        { stage: 'add_to_cart', count: addToCartCount },
        { stage: 'click_intent', count: clickCount },
        { stage: 'orders_completed', count: completedOrdersCount }
      ],
      metrics: {
        addToCartRate: Number(addToCartRate.toFixed(2)),
        orderConversionRate: Number(orderConversionRate.toFixed(2)),
        visitToOrderRate: Number(visitToOrderRate.toFixed(2)),
        totalOrders: totalOrdersCount
      }
    });
  } catch (error) {
    console.error('Error fetching conversion funnel analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversion funnel analytics', error: error.message });
  }
};

// Delivery health analytics
const getDeliveryHealth = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();

    const deliveredOrders = await Order.findAll({
      where: {
        createdAt: { [Op.between]: [start, end] },
        status: { [Op.in]: ['completed', 'delivered'] },
        actualDelivery: { [Op.ne]: null }
      },
      attributes: ['id', 'createdAt', 'actualDelivery', 'estimatedDelivery', 'deliveryRating'],
      raw: true
    });

    const totalDelivered = deliveredOrders.length;
    let totalDeliveryMs = 0;
    let onTimeCount = 0;
    let estimatedCount = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    deliveredOrders.forEach(order => {
      const actual = new Date(order.actualDelivery);
      const created = new Date(order.createdAt);
      totalDeliveryMs += Math.max(0, actual - created);

      if (order.estimatedDelivery) {
        estimatedCount += 1;
        if (actual <= new Date(order.estimatedDelivery)) {
          onTimeCount += 1;
        }
      }

      if (order.deliveryRating) {
        ratingSum += parseFloat(order.deliveryRating) || 0;
        ratingCount += 1;
      }
    });

    const avgDeliveryHours = totalDelivered > 0 ? totalDeliveryMs / totalDelivered / (1000 * 60 * 60) : 0;
    const onTimeDeliveryRate = estimatedCount > 0 ? (onTimeCount / estimatedCount) * 100 : null;
    const averageDeliveryRating = ratingCount > 0 ? ratingSum / ratingCount : null;

    res.json({
      success: true,
      dateRange: { start, end },
      summary: {
        totalDeliveredOrders: totalDelivered,
        avgDeliveryHours: Number(avgDeliveryHours.toFixed(2)),
        onTimeDeliveryRate: onTimeDeliveryRate !== null ? Number(onTimeDeliveryRate.toFixed(2)) : null,
        deliveryRating: averageDeliveryRating !== null ? Number(averageDeliveryRating.toFixed(2)) : null,
        estimatedDeliverySample: estimatedCount
      }
    });
  } catch (error) {
    console.error('Error fetching delivery health analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery health analytics', error: error.message });
  }
};

// Product velocity analytics
const getProductVelocity = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();

    const [salesStats, viewStats] = await Promise.all([
      OrderItem.findAll({
        where: { createdAt: { [Op.between]: [start, end] } },
        attributes: [
          'productId',
          [fn('COUNT', col('id')), 'orderCount'],
          [fn('SUM', col('quantity')), 'quantitySold'],
          [fn('SUM', col('total')), 'revenue']
        ],
        group: ['productId'],
        raw: true
      }),
      ProductView.findAll({
        where: { createdAt: { [Op.between]: [start, end] } },
        attributes: [
          'productId',
          [fn('COUNT', col('id')), 'views']
        ],
        group: ['productId'],
        raw: true
      })
    ]);

    const salesMap = new Map(salesStats.map(row => [row.productId, row]));
    const velocity = viewStats
      .filter(row => row.productId)
      .map(row => {
        const productSales = salesMap.get(row.productId) || {};
        const orders = parseInt(productSales.orderCount || 0);
        const views = parseInt(row.views || 0);
        const conversionRate = views > 0 ? (orders / views) * 100 : 0;
        return {
          productId: row.productId,
          views,
          orders,
          quantitySold: parseInt(productSales.quantitySold || 0),
          revenue: parseFloat(productSales.revenue || 0),
          conversionRate: Number(conversionRate.toFixed(2))
        };
      });

    const lowConversionProducts = velocity
      .sort((a, b) => a.conversionRate - b.conversionRate || b.views - a.views)
      .slice(0, 10);

    const topSellingProducts = salesStats
      .filter(row => row.productId)
      .sort((a, b) => parseInt(b.quantitySold || 0) - parseInt(a.quantitySold || 0))
      .slice(0, 10);

    const productIds = new Set([
      ...lowConversionProducts.map(item => item.productId),
      ...topSellingProducts.map(item => item.productId)
    ]);

    const products = await Product.findAll({
      where: { id: { [Op.in]: Array.from(productIds) } },
      attributes: ['id', 'name', 'displayPrice', 'coverImage', 'approved'],
      raw: true
    });

    const productById = new Map(products.map(p => [p.id, p]));

    const mapProduct = (item) => ({
      ...item,
      product: productById.get(item.productId) || null
    });

    res.json({
      success: true,
      dateRange: { start, end },
      topSellingProducts: topSellingProducts.map(mapProduct),
      lowConversionProducts: lowConversionProducts.map(mapProduct)
    });
  } catch (error) {
    console.error('Error fetching product velocity analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product velocity analytics', error: error.message });
  }
};

// Get Platform Growth & Socio-Economic Impact Analytics
const getPlatformImpactAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const end = endDate ? parseDateOnlyUtc(endDate, true) : new Date();
    const start = startDate ? parseDateOnlyUtc(startDate, false) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Economic Empowerment
    // Seller Earnings: sum of basePrice * quantity for order items in completed/delivered orders
    const sellerEarningsItems = await OrderItem.findAll({
      include: [{
        model: Order,
        where: {
          status: { [Op.in]: ['completed', 'delivered'] },
          createdAt: { [Op.between]: [start, end] }
        },
        attributes: []
      }],
      attributes: ['price', 'basePrice', 'quantity'],
      raw: true
    });

    let totalSellerEarnings = 0;
    sellerEarningsItems.forEach(item => {
      const base = parseFloat(item.basePrice || item.price || 0);
      const qty = parseInt(item.quantity || 1);
      totalSellerEarnings += (base * qty);
    });

    // Marketer commissions
    const totalMarketerCommissions = await Commission.sum('commissionAmount', {
      where: {
        status: { [Op.in]: ['success', 'paid'] },
        createdAt: { [Op.between]: [start, end] }
      }
    }) || 0;

    // Delivery agent earnings
    const totalDeliveryEarnings = await DeliveryTask.sum('agentEarnings', {
      where: {
        status: 'completed',
        createdAt: { [Op.between]: [start, end] }
      }
    }) || 0;

    const totalCommunityEarnings = totalSellerEarnings + totalMarketerCommissions + totalDeliveryEarnings;

    // Counts of active agents
    const activeSellersCount = await OrderItem.count({
      distinct: true,
      col: 'sellerId',
      include: [{
        model: Order,
        where: {
          status: { [Op.in]: ['completed', 'delivered'] },
          createdAt: { [Op.between]: [start, end] }
        }
      }]
    });

    const activeMarketersCount = await Commission.count({
      distinct: true,
      col: 'marketerId',
      where: {
        status: { [Op.in]: ['success', 'paid'] },
        createdAt: { [Op.between]: [start, end] }
      }
    });

    const activeDeliveryAgentsCount = await DeliveryTask.count({
      distinct: true,
      col: 'deliveryAgentId',
      where: {
        status: 'completed',
        createdAt: { [Op.between]: [start, end] }
      }
    });

    // 2. Loyalty & CLV
    const periodOrders = await Order.findAll({
      where: {
        status: { [Op.in]: ['completed', 'delivered'] },
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: ['userId', 'total'],
      raw: true
    });

    const userIds = [...new Set(periodOrders.map(o => o.userId).filter(Boolean))];
    const totalGmv = periodOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const totalUniqueBuyers = userIds.length;
    const customerLifetimeValue = totalUniqueBuyers > 0 ? totalGmv / totalUniqueBuyers : 0;

    let repeatBuyersCount = 0;
    if (totalUniqueBuyers > 0) {
      const userOrderCounts = await Order.findAll({
        attributes: ['userId', [fn('COUNT', col('id')), 'orderCount']],
        where: {
          userId: { [Op.in]: userIds },
          status: { [Op.in]: ['completed', 'delivered'] }
        },
        group: ['userId'],
        raw: true
      });
      userOrderCounts.forEach(u => {
        const count = parseInt(u.orderCount || u.prevCount || 0);
        if (count >= 2) {
          repeatBuyersCount++;
        }
      });
    }

    const repeatPurchaseRate = totalUniqueBuyers > 0 ? (repeatBuyersCount / totalUniqueBuyers) * 100 : 0;
    const averageOrderFrequency = totalUniqueBuyers > 0 ? (periodOrders.length / totalUniqueBuyers) : 0;

    // 3. Conversational/Direct Commerce Adoption
    const directOrders = await Order.findAll({
      where: {
        originalTextBlock: { [Op.ne]: null },
        createdAt: { [Op.between]: [start, end] }
      },
      attributes: ['status', 'total'],
      raw: true
    });

    const totalOrdersCount = await Order.count({
      where: {
        createdAt: { [Op.between]: [start, end] }
      }
    });

    const totalDirectOrdersPlaced = directOrders.length;
    const totalDirectOrdersCompleted = directOrders.filter(o => ['completed', 'delivered'].includes(o.status)).length;
    const totalDirectGmv = directOrders.filter(o => ['completed', 'delivered'].includes(o.status)).reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    const directOrderShareRate = totalOrdersCount > 0 ? (totalDirectOrdersPlaced / totalOrdersCount) * 100 : 0;
    const directOrderGmvShareRate = totalGmv > 0 ? (totalDirectGmv / totalGmv) * 100 : 0;

    // 4. Service Quality & Trust
    const ratingData = await Order.findOne({
      attributes: [
        [fn('AVG', col('deliveryRating')), 'avgRating'],
        [fn('COUNT', col('deliveryRating')), 'countRating']
      ],
      where: {
        deliveryRating: { [Op.ne]: null },
        status: { [Op.in]: ['completed', 'delivered'] },
        createdAt: { [Op.between]: [start, end] }
      },
      raw: true
    });

    const avgDeliveryRating = parseFloat(ratingData?.avgRating || 0);

    const completedOrdersCount = periodOrders.length;
    const orderFulfillmentRate = totalOrdersCount > 0 ? (completedOrdersCount / totalOrdersCount) * 100 : 0;

    const totalDisputesOrReturns = await ReturnRequest.count({
      where: {
        createdAt: { [Op.between]: [start, end] }
      }
    });
    const disputeRate = totalOrdersCount > 0 ? (totalDisputesOrReturns / totalOrdersCount) * 100 : 0;

    const cancellations = await Order.findAll({
      attributes: ['cancelReason'],
      where: {
        status: 'cancelled',
        cancelReason: { [Op.ne]: null },
        createdAt: { [Op.between]: [start, end] }
      },
      raw: true
    });

    const reasonCounts = {};
    cancellations.forEach(c => {
      const reason = c.cancelReason ? c.cancelReason.trim() : 'Unspecified';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    const topCancellationReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 5. Growth trends (Cohorts)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const newUsers = await User.findAll({
      attributes: ['role', 'roles', 'createdAt'],
      where: {
        createdAt: { [Op.gte]: sixMonthsAgo }
      },
      raw: true
    });

    const cohortData = {};
    newUsers.forEach(u => {
      const date = new Date(u.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      let rolesList = ['customer'];
      if (u.roles) {
        try {
          const parsed = typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles;
          if (Array.isArray(parsed)) rolesList = parsed;
        } catch (e) {
          if (u.role) rolesList = [u.role];
        }
      } else if (u.role) {
        rolesList = [u.role];
      }
      
      if (!cohortData[monthKey]) {
        cohortData[monthKey] = {};
      }
      
      rolesList.forEach(r => {
        cohortData[monthKey][r] = (cohortData[monthKey][r] || 0) + 1;
      });
    });

    // Format cohort data for frontend charts
    const sortedMonths = Object.keys(cohortData).sort();
    const formattedCohorts = sortedMonths.map(month => ({
      month,
      customer: cohortData[month].customer || 0,
      seller: cohortData[month].seller || 0,
      marketer: cohortData[month].marketer || 0,
      delivery_agent: cohortData[month].delivery_agent || cohortData[month].deliveryAgent || 0,
      service_provider: cohortData[month].service_provider || cohortData[month].serviceProvider || 0
    }));

    res.json({
      success: true,
      data: {
        economicEmpowerment: {
          totalSellerEarnings: Number(totalSellerEarnings.toFixed(2)),
          totalMarketerCommissions: Number(totalMarketerCommissions.toFixed(2)),
          totalDeliveryEarnings: Number(totalDeliveryEarnings.toFixed(2)),
          totalCommunityEarnings: Number(totalCommunityEarnings.toFixed(2)),
          activeSellersCount,
          activeMarketersCount,
          activeDeliveryAgentsCount
        },
        loyaltyAndCLV: {
          customerLifetimeValue: Number(customerLifetimeValue.toFixed(2)),
          repeatPurchaseRate: Number(repeatPurchaseRate.toFixed(2)),
          averageOrderFrequency: Number(averageOrderFrequency.toFixed(2)),
          totalUniqueBuyers,
          repeatBuyersCount
        },
        directCommerce: {
          totalDirectOrdersPlaced,
          totalDirectOrdersCompleted,
          totalDirectGmv: Number(totalDirectGmv.toFixed(2)),
          directOrderShareRate: Number(directOrderShareRate.toFixed(2)),
          directOrderGmvShareRate: Number(directOrderGmvShareRate.toFixed(2))
        },
        serviceQualityAndTrust: {
          averageDeliveryRating: Number(avgDeliveryRating.toFixed(2)),
          orderFulfillmentRate: Number(orderFulfillmentRate.toFixed(2)),
          totalDisputesOrReturns,
          disputeRate: Number(disputeRate.toFixed(2)),
          topCancellationReasons
        },
        growthCohorts: formattedCohorts
      }
    });

  } catch (error) {
    console.error('Error fetching platform impact analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform impact analytics', error: error.message });
  }
};

module.exports = {
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
};
