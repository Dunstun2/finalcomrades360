const { Op } = require('sequelize');
const { Product, User, Category, Service, ServiceImage, FastFood, HeroPromotion, sequelize } = require('../models');
const cacheService = require('../scripts/services/cacheService');

const isInlineImageData = (value) => typeof value === 'string' && value.trim().toLowerCase().startsWith('data:image');

const getListSafeImage = (value) => (isInlineImageData(value) ? null : value || null);

const getUltraFastHomepageProducts = async (req, res) => {
  const startTime = Date.now();

  try {

    // Generate cache key based on parameters
    const isMarketing = req.query.marketing === 'true';
    const cacheKey = `homepage:ultra-fast:${req.query.limit || 8}:${req.query.page || 1}:${isMarketing ? 'marketing' : 'standard'}`;

    // Try to get from cache first
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      const responseTime = Date.now() - startTime;
      console.log(`[UltraFastHomepage] Cache hit in ${responseTime}ms`);

      // Add performance headers
      res.set({
        'X-Cache': 'HIT',
        'X-Response-Time': `${responseTime}ms`,
        'X-Cache-Type': 'redis'
      });

      return res.status(200).json(cachedData);
    }

    const whereClause = {
      approved: true,
      visibilityStatus: 'visible',
      suspended: false,
      isActive: true,
      status: 'active'
    };

    if (isMarketing) {
      whereClause.marketingEnabled = true;
      whereClause.marketingCommission = { [Op.gt]: 1 };
    }

    // Get total count for pagination (same as regular endpoint)
    const totalCount = await Product.count({
      where: whereClause
    });

    // Ultra-optimized query with minimal data transfer
    const limit = Math.min(parseInt(req.query.limit) || 24, 50); // Load 24 by default for 4 rows
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    console.log(`[UltraFast] Request - Marketing: ${isMarketing}, CommFilter: ${JSON.stringify(whereClause.marketingCommission)}`);

    // Ultra-optimized query with minimal data transfer
    const products = await Product.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'shortDescription',
        'basePrice',
        'displayPrice',
        'discountPrice',
        'discountPercentage',
        'categoryId',
        'subcategoryId',
        'coverImage',
        'deliveryFee',
        'marketingCommission',
        'marketingCommissionType',
        'createdAt',
        'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name'],
          required: false,
          where: {
            role: { [Op.in]: ['superadmin', 'admin'] }
          }
        }
      ],
      order: [
        // Super admin products first, then by creation date
        [{ model: User, as: 'seller' }, 'role', 'ASC'],
        ['createdAt', 'DESC']
      ],
      limit: limit,
      offset: offset,
      subQuery: false // Disable subquery for better performance
    });

    // Minimal processing - only essential data
    const sanitizedProducts = products.map(product => {
      const plain = product.get({ plain: true });

      // Only keep essential fields with proper image handling
      return {
        id: plain.id,
        name: plain.name,
        shortDescription: plain.shortDescription,
        basePrice: plain.basePrice,
        displayPrice: plain.displayPrice || plain.basePrice,
        discountPrice: plain.discountPrice,
        discountPercentage: plain.discountPercentage,
        categoryId: plain.categoryId,
        subcategoryId: plain.subcategoryId,
        // Properly handle images (reconstruct array from single cover image)
        coverImage: getListSafeImage(plain.coverImage),
        images: getListSafeImage(plain.coverImage) ? [getListSafeImage(plain.coverImage)] : [],
        deliveryFee: plain.deliveryFee || 0,
        // Marketing fields
        marketingCommission: plain.marketingCommission,
        marketingCommissionType: plain.marketingCommissionType,
        // Flag super admin products for the frontend
        isSuperAdminProduct: !!(plain.seller && ['superadmin', 'super_admin', 'super-admin', 'admin'].includes(String(plain.seller.role || '').toLowerCase())),
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt
      };
    });

    const result = {
      products: sanitizedProducts,
      totalCount: totalCount,
      isUltraFastData: true,
      loadedAt: new Date().toISOString(),
      pagination: {
        page,
        limit,
        hasMore: products.length === limit,
        totalProducts: totalCount
      }
    };

    // Cache for 2 minutes (120 seconds) for homepage data
    await cacheService.set(cacheKey, result, 120);

    res.status(200).json(result);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[UltraFastHomepage] Error:', error.message, `(${responseTime}ms)`);

    res.status(500).json({
      message: 'Server error while fetching ultra-fast homepage products.',
      error: error.message,
      responseTime: `${responseTime}ms`
    });
  }
};

// Batch endpoint for multiple data types in one request
const getHomepageBatchData = async (req, res) => {
  const startTime = Date.now();
  const isMarketing = req.query.marketing === 'true';

  try {
    // FORCE CACHE BUST FROM V4 -> V5
    const cacheKey = `homepage:batch:v5:${isMarketing ? 'marketing' : 'standard'}`;
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      const responseTime = Date.now() - startTime;
      res.set({
        'X-Cache': 'HIT',
        'X-Response-Time': `${responseTime}ms`,
        'X-Cache-Type': 'redis'
      });
      return res.status(200).json(cachedData);
    }

    // Debug logging
    console.log(`[Batch] Request - Marketing: ${isMarketing}, Query: ${JSON.stringify(req.query)}`);


    // Execute multiple queries in parallel for better performance
    // Wrapped in separate handlers for better debugging of 500 errors
    const fetchProductsData = async () => {
      try {
        const whereClause = {
          approved: true,
          visibilityStatus: 'visible',
          suspended: false,
          isActive: true,
          status: 'active'
        };

        if (isMarketing) {
          whereClause.marketingEnabled = true;
          whereClause.marketingCommission = { [Op.gt]: 1 };
        }

        const [results, totalCount] = await Promise.all([
          Product.findAll({
            where: whereClause,
            attributes: [
              'id', 'name', 'basePrice', 'displayPrice',
              'discountPrice', 'discountPercentage', 'stock',
              'categoryId', 'subcategoryId', 'createdAt',
              'coverImage',
              'deliveryFee',
              'marketingCommission', 'marketingCommissionType', 'approved',
              'visibilityStatus', 'suspended', 'isActive', 'status'
            ],
            include: [{
              model: User,
              as: 'seller',
              attributes: ['id', 'name', 'role'],
              required: false
            }],
            order: [['createdAt', 'DESC']],
            limit: 48,
            subQuery: false
          }),
          Product.count({ where: whereClause })
        ]);

        return { results, totalCount };
      } catch (err) {
        return { results: [], totalCount: 0 };
      }
    };

    const fetchCategories = async () => {
      try {
        const { Category, Subcategory, Product } = require('../models');

        // 1. Fetch base categories
        const categories = await Category.findAll({
          where: { parentId: null },
          attributes: ['id', 'name', 'emoji', 'slug'],
          include: [{
            model: Subcategory,
            as: 'Subcategory',
            attributes: ['id', 'name', 'emoji', 'slug']
          }],
          order: [['name', 'ASC']]
        });

        // 2. Fetch product counts in parallel (Aggregation)
        const productCounts = await Product.findAll({
          where: {
            approved: true,
            visibilityStatus: 'visible',
            suspended: false,
            isActive: true,
            status: 'active'
          },
          attributes: [
            'categoryId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          group: ['categoryId'],
          raw: true
        });

        // 3. Map counts to categories
        const countMap = {};
        productCounts.forEach(p => {
          countMap[p.categoryId] = parseInt(p.count || 0);
        });

        // 4. Merge data
        return categories.map(cat => {
          // Convert sequelize model to plain object if needed, though attributes usage typically implies structure
          const plain = cat.get({ plain: true });
          plain.productCount = countMap[plain.id] || 0;
          // We can skip subcategory count or fetch it similarly if critical, but usually product count is the bottleneck.
          // For now, setting subcategoryCount based on the loaded array length to save a query
          plain.subcategoryCount = plain.Subcategory ? plain.Subcategory.length : 0;
          return plain;
        });

      } catch (err) {
        console.error('[HomepageBatch] Categories query failed:', err.message);
        return [];
      }
    };

    const fetchServicesData = async () => {
      try {
        console.log('[HomepageBatch] Fetching services...');
        const whereClause = { status: 'approved' };

        if (isMarketing) {
          whereClause.marketingEnabled = true;
          whereClause.marketingCommission = { [Op.gt]: 1 };
          // For services in marketing mode, we show them regardless of isAvailable
        } else {
          whereClause.isAvailable = true;
        }

        const [services, totalCount] = await Promise.all([
          Service.findAll({
            where: whereClause,
            attributes: [
              'id', 'title', 'basePrice', 'displayPrice', 'rating', 'userId',
              'status', 'isAvailable', 'availabilityMode', 'availabilityDays',
              'location', 'vendorLocation', 'isFeatured', 'discountPercentage',
              'discountPrice', 'price', 'deliveryFee', 'marketingCommission', 'marketingCommissionType', 'marketingEnabled',
              'categoryId', 'subcategoryId'
            ],
            include: [{
              model: ServiceImage,
              as: 'images',
              attributes: ['imageUrl'],
              limit: 1
            }],
            order: [['createdAt', 'DESC']],
            limit: 48
          }),
          Service.count({ where: whereClause })
        ]);
        console.log(`[HomepageBatch] Found ${services.length} approved services (Total: ${totalCount})`);
        return { services, totalCount };
      } catch (err) {
        console.error('[HomepageBatch] Services query failed:', err);
        return { services: [], totalCount: 0 };
      }
    };

    const fetchFastFoodData = async () => {
      try {
        const whereClause = { isActive: true, approved: true };

        if (isMarketing) {
          whereClause.marketingEnabled = true;
          whereClause.marketingCommission = { [Op.gt]: 1 };
          // No isAvailable check
        } else {
          whereClause.isAvailable = true;
        }

        const [items, totalCount] = await Promise.all([
          FastFood.findAll({
            where: whereClause,
            attributes: [
              'id', 'name', 'basePrice', 'displayPrice', 'mainImage', 'ratings',
              'vendor', 'isFeatured', 'isActive', 'isAvailable',
              'dietaryTags', 'kitchenVendor', 'vendorLocation', 'updatedAt',
              'discountPercentage', 'discountPrice', 'deliveryFee', 'marketingCommission', 'marketingCommissionType', 'marketingEnabled',
              'categoryId', 'subcategoryId', 'status'
            ],
            order: [['createdAt', 'DESC']],
            limit: 48
          }),
          FastFood.count({ where: whereClause })
        ]);
        return { items, totalCount };
      } catch (err) {
        console.error('[HomepageBatch] FastFood query failed:', err.message);
        return { items: [], totalCount: 0 };
      }
    };

    const [
      productsResult,
      categoriesResult,
      servicesResult,
      fastFoodResult,
      heroPromosResult
    ] = await Promise.all([
      (async () => {
        const start = Date.now();
        const res = await fetchProductsData();
        console.log(`⏱️ [Batch] Products fetched: ${res.results.length} (Marketing: ${isMarketing}) in ${Date.now() - start}ms`);
        return res;
      })(),
      (async () => {
        const start = Date.now();
        const res = await fetchCategories();
        console.log(`⏱️ [Batch] Categories fetched in ${Date.now() - start}ms`);
        return res;
      })(),
      (async () => {
        const start = Date.now();
        const res = await fetchServicesData();
        console.log(`⏱️ [Batch] Services fetched: ${res.services.length} (Marketing: ${isMarketing}) in ${Date.now() - start}ms`);
        return res;
      })(),
      (async () => {
        const start = Date.now();
        const res = await fetchFastFoodData();
        console.log(`⏱️ [Batch] FastFood fetched: ${res.items.length} (Marketing: ${isMarketing}) in ${Date.now() - start}ms`);
        return res;
      })(),
      // 5. Fetch real active hero promotions
      (async () => {
        try {
          const now = new Date();
          const items = await HeroPromotion.findAll({
            where: {
              status: { [Op.in]: ['active', 'scheduled'] },
              startAt: { [Op.lte]: now },
              endAt: { [Op.gte]: now }
            },
            order: [['startAt', 'ASC']],
            limit: 5
          });

          const result = [];
          for (const p of items) {
            const ids = p.productIds || [];
            const prods = await Product.findAll({
              where: { id: { [Op.in]: ids } },
              attributes: ['id', 'name', 'coverImage', 'displayPrice', 'discountPrice', 'discountPercentage']
            });
            result.push({
              ...p.toJSON(),
              products: prods.map((product) => {
                const plain = product.get ? product.get({ plain: true }) : product;
                return {
                  ...plain,
                  coverImage: getListSafeImage(plain.coverImage)
                };
              })
            });
          }
          return result;
        } catch (err) {
          console.error('[HomepageBatch] HeroPromotions query failed:', err.message);
          return [];
        }
      })()
    ]);

    // Process products with proper image handling
    const productsRes = productsResult || { results: [], totalCount: 0 };
    const products = productsRes.results.map(product => {
      try {
        const plain = product.get ? product.get({ plain: true }) : product;

        const firstImage = getListSafeImage(plain.coverImage);
        const images = firstImage ? [firstImage] : []; // Ensure images array has the cover image for frontend compatibility

        return {
          id: plain.id,
          name: plain.name,
          shortDescription: plain.shortDescription,
          basePrice: plain.basePrice,
          displayPrice: plain.displayPrice || plain.basePrice,
          discountPrice: plain.discountPrice,
          discountPercentage: plain.discountPercentage,
          categoryId: plain.categoryId,
          subcategoryId: plain.subcategoryId,
          coverImage: firstImage,
          images: images,
          deliveryFee: plain.deliveryFee || 0,
          marketingCommission: plain.marketingCommission,
          marketingCommissionType: plain.marketingCommissionType,
          approved: plain.approved,
          visibilityStatus: plain.visibilityStatus,
          suspended: plain.suspended,
          isActive: plain.isActive,
          status: plain.status,
          isSuperAdminProduct: !!(plain.seller && (String(plain.seller.role || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'superadmin' || String(plain.seller.role || '').toLowerCase().replace(/[^a-z0-9]/g, '') === 'admin'))
        };
      } catch (err) {
        console.error('[HomepageBatch] Process product error:', err.message);
        return null;
      }
    }).filter(Boolean);

    // Process services
    const servicesRes = servicesResult || { services: [], totalCount: 0 };
    const services = servicesRes.services.map(service => {
      try {
        const plain = service.get ? service.get({ plain: true }) : service;
        let images = [];
        if (plain.images) {
          if (typeof plain.images === 'string') {
            try {
              const parsed = JSON.parse(plain.images);
              images = Array.isArray(parsed) ? parsed.map(img => img.imageUrl || img) : [];
            } catch (e) { images = []; }
          } else if (Array.isArray(plain.images)) {
            images = plain.images.map(img => img.imageUrl || img);
          }
        }


        return {
          id: plain.id,
          title: plain.title,
          name: plain.title, // Alias for consistency
          basePrice: plain.basePrice,
          displayPrice: plain.displayPrice,
          rating: plain.rating,
          userId: plain.userId,
          status: plain.status,
          isAvailable: plain.isAvailable,
          availabilityMode: plain.availabilityMode,
          availabilityDays: plain.availabilityDays,
          location: plain.location,
          vendorLocation: plain.vendorLocation,
          isFeatured: plain.isFeatured,
          discountPercentage: plain.discountPercentage,
          discountPrice: plain.discountPrice,
          price: plain.price,
          deliveryFee: plain.deliveryFee || 0,
          marketingCommission: plain.marketingCommission,
          marketingCommissionType: plain.marketingCommissionType,
          categoryId: plain.categoryId,
          subcategoryId: plain.subcategoryId,
          images: images,
          coverImage: images.length > 0 ? images[0] : null
        };
      } catch (err) {
        console.error('[HomepageBatch] Process service error:', err.message);
        return null;
      }
    }).filter(Boolean);

    // Process fast food
    const fastFoodRes = fastFoodResult || { items: [], totalCount: 0 };
    const fastFood = fastFoodRes.items.map(item => {
      try {
        return item.get ? item.get({ plain: true }) : item;
      } catch (err) {
        return null;
      }
    }).filter(Boolean);

    // Process categories
    const categories = (categoriesResult || []).map(category => {
      const plain = category.get ? category.get({ plain: true }) : category;
      return {
        id: plain.id,
        name: plain.name,
        emoji: plain.emoji || '📦',
        slug: plain.slug,
        productCount: parseInt(plain.productCount) || 0,
        subcategoryCount: parseInt(plain.subcategoryCount) || 0,
        subcategories: plain.Subcategory || []
      };
    });

    const batchData = {
      products,
      categories,
      services: services,
      fastFood,
      heroPromotions: heroPromosResult,
      loadedAt: new Date().toISOString(),
      isBatchData: true,
      pagination: {
        totalProducts: productsRes.totalCount,
        totalServices: servicesRes.totalCount,
        totalFastFood: fastFoodRes.totalCount
      }
    };

    // Cache for 5 minutes (300 seconds)
    await cacheService.set(cacheKey, batchData, 300);

    const responseTime = Date.now() - startTime;

    res.set({
      'X-Cache': 'MISS',
      'X-Response-Time': `${responseTime}ms`,
      'X-Cache-Type': 'redis'
    });

    res.status(200).json(batchData);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[HomepageBatch] Error:', error.message, `(${responseTime}ms)`);

    res.status(500).json({
      message: 'Server error while fetching batch homepage data.',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      responseTime: `${responseTime}ms`
    });
  }
};

// Cache invalidation endpoint for admin use
const invalidateHomepageCache = async (req, res) => {
  try {
    console.log('[CacheInvalidation] Invalidating homepage cache');

    // Delete all homepage-related cache entries
    await cacheService.delPattern('homepage:*');

    res.status(200).json({
      message: 'Homepage cache invalidated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CacheInvalidation] Error:', error.message);
    res.status(500).json({
      message: 'Error invalidating cache',
      error: error.message
    });
  }
};

module.exports = {
  getUltraFastHomepageProducts,
  getHomepageBatchData,
  invalidateHomepageCache
};