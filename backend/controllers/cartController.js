const { Cart, Product, User } = require('../models');
const { Op } = require('sequelize');
const { calculateItemCommission } = require('../utils/commissionUtils');
const { isFastFoodOpen } = require('../utils/fastFoodUtils');

const parseMaybeJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
};

const getItemVariants = (itemDetails, isFastFood) => {
  if (!itemDetails) return [];
  if (isFastFood) {
    return parseMaybeJson(itemDetails.sizeVariants, []);
  }

  const directVariants = parseMaybeJson(itemDetails.variants, []);
  if (Array.isArray(directVariants) && directVariants.length > 0) return directVariants;

  const tags = parseMaybeJson(itemDetails.tags, {});
  const tagVariants = parseMaybeJson(tags?.variants, []);
  return Array.isArray(tagVariants) ? tagVariants : [];
};

const findVariantById = (variants, variantId) => {
  if (!variantId || !Array.isArray(variants)) return null;
  const target = String(variantId).toLowerCase();
  return variants.find((v) => {
    if (!v || typeof v !== 'object') return false;
    const candidates = [v.id, v.name, v.size, v.sku].filter(Boolean).map((x) => String(x).toLowerCase());
    return candidates.includes(target);
  }) || null;
};

const getVariantDisplayName = (variant, fallbackId) => {
  if (!variant || typeof variant !== 'object') return fallbackId || null;
  return variant.name || variant.size || variant.sku || fallbackId || null;
};

const getFastFoodSellerKey = (item) => {
  const fastFood = item?.fastFood || item;
  return fastFood?.vendor || fastFood?.vendorId || fastFood?.sellerId || fastFood?.userId || fastFood?.id || null;
};

const FASTFOOD_DELIVERY_INCREMENT_RATE = 0.15;

const calculateFastFoodSellerIncrementalFee = (baseFee, itemCount) => {
  const safeBaseFee = Number(baseFee || 0);
  const safeItemCount = Number(itemCount || 0);
  if (safeBaseFee <= 0 || safeItemCount <= 0) return 0;
  const extraItems = Math.max(0, safeItemCount - 1);
  return safeBaseFee + (safeBaseFee * FASTFOOD_DELIVERY_INCREMENT_RATE * extraItems);
};

const buildFastFoodSellerQuantityMap = (items = []) => {
  const quantities = new Map();
  items
    .filter((item) => item.itemType === 'fastfood')
    .forEach((item) => {
      const sellerKey = getFastFoodSellerKey(item);
      const sellerToken = sellerKey === null ? `fastfood:${item.fastFoodId || item.id}` : `fastfood:${sellerKey}`;
      const qty = Number(item.quantity || 0);
      quantities.set(sellerToken, (quantities.get(sellerToken) || 0) + qty);
    });
  return quantities;
};

const calculateGroupedDeliveryFee = (items = []) => {
  let totalDeliveryFee = 0;
  const sellerQuantities = buildFastFoodSellerQuantityMap(items);
  const sellerFees = new Map();

  items
    .filter((item) => item.itemType === 'fastfood')
    .forEach((item) => {
      const sellerKey = getFastFoodSellerKey(item);
      const sellerToken = sellerKey === null ? `fastfood:${item.fastFoodId || item.id}` : `fastfood:${sellerKey}`;
      if (!sellerFees.has(sellerToken)) {
        // PRIORITIZE LIVE DATA: Use item.fastFood.deliveryFee if available
        const liveFee = item.fastFood?.deliveryFee !== undefined && item.fastFood?.deliveryFee !== null 
          ? Number(item.fastFood.deliveryFee) 
          : Number(item.deliveryFee || 0);
        sellerFees.set(sellerToken, liveFee);
      }
    });

  items.forEach((item) => {
    const quantity = Number(item.quantity || 0);

    if (item.itemType === 'fastfood') {
      const sellerKey = getFastFoodSellerKey(item);
      const sellerToken = sellerKey === null ? `fastfood:${item.fastFoodId || item.id}` : `fastfood:${sellerKey}`;

      if (sellerFees.has(sellerToken)) {
        const sellerQty = sellerQuantities.get(sellerToken) || 0;
        totalDeliveryFee += calculateFastFoodSellerIncrementalFee(sellerFees.get(sellerToken), sellerQty);
        sellerFees.delete(sellerToken);
      }
      return;
    }

    let unitFee = 0;
    if (item.itemType === 'service' && item.service) {
      unitFee = Number(item.service.deliveryFee || 0);
    } else if (item.product) {
      unitFee = Number(item.product.deliveryFee || 0);
    } else {
      unitFee = (Number(item.deliveryFee || 0) / (quantity || 1));
    }

    totalDeliveryFee += unitFee * quantity;
  });

  return totalDeliveryFee;
};

// Add item to cart
const mergeCart = async (req, res) => {
  const t = await require('../models').sequelize.transaction();
  try {
    const userId = req.user.id;
    const { items, cartType = 'personal' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.json({ success: true, message: 'No items to merge' });
    }

    console.log(`🔄 [CART MERGE] Merging ${items.length} items for user ${userId}`);

    for (const item of items) {
      // Determine IDs and type (handle both frontend and backend naming conventions)
      const productId = item.productId || (item.itemType === 'product' ? item.id : null);
      const fastFoodId = item.fastFoodId || (item.itemType === 'fastfood' ? item.id : null);
      const serviceId = item.serviceId || (item.itemType === 'service' ? item.id : null);
      const quantity = parseInt(item.quantity) || 1;
      const type = item.itemType || 'product';

      // Skip invalid items
      if (!productId && !fastFoodId && !serviceId) continue;

      // Determine price and fees (use what's passed or defaults, ideally we should re-fetch but for merge we trust frontend/guest-cart mostly OR re-fetch. 
      // Safest is to re-use addToCart logic or simplified version. 
      // For speed in this specific task i will trust the numeric values passed (with some sanity checks) 
      // OR better, we just re-use the find logic.
      // Let's keep it simple: We use the re-calculate logic effectively by checking existence.

      const query = { userId, cartType };
      if (type === 'fastfood') {
        query.fastFoodId = fastFoodId;
        query.itemType = 'fastfood';
        query.variantId = item.variantId || null;
        query.comboId = item.comboId || null;
        query.batchId = item.batchId || null;
      } else if (type === 'service') {
        query.serviceId = serviceId;
        query.itemType = 'service';
      } else {
        query.productId = productId;
        query.itemType = 'product';
        query.variantId = item.variantId || null;
      }

      const existingItem = await Cart.findOne({ where: query, transaction: t });

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        const unitPrice = parseFloat(existingItem.price);
        const unitDeliveryFee = type === 'fastfood'
          ? parseFloat(existingItem.deliveryFee || 0)
          : parseFloat(existingItem.deliveryFee) / existingItem.quantity;
        const unitCommission = parseFloat(existingItem.itemCommission) / existingItem.quantity;

        await existingItem.update({
          quantity: newQuantity,
          total: unitPrice * newQuantity,
          deliveryFee: type === 'fastfood' ? unitDeliveryFee : unitDeliveryFee * newQuantity,
          itemCommission: unitCommission * newQuantity
        }, { transaction: t });
      } else {
        // Create new item
        // We need to ensure we have valid price/commission data. 
        // If the guest cart has it, we use it. If not, we might ideally want to fetch it.
        // Assuming guest cart object structure matches what we expect from frontend context which mirrors backend.

        await Cart.create({
          userId,
          cartType,
          itemType: type,
          productId: type === 'product' ? productId : null,
          fastFoodId: type === 'fastfood' ? fastFoodId : null,
          serviceId: type === 'service' ? serviceId : null,
          variantId: item.variantId || null,
          comboId: item.comboId || null,
          batchId: item.batchId || null,
          quantity: quantity,
          price: item.price,
          total: item.total || (item.price * quantity),
          deliveryFee: item.deliveryFee || 0,
          itemCommission: item.itemCommission || 0
        }, { transaction: t });
      }
    }

    await t.commit();

    // Return updated cart
    // Return success - Frontend should refetch if needed
    // const updatedCart = await getCartData(userId, cartType); // Removed undefined function call

    res.json({ success: true, message: 'Cart merged successfully' });

  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error('Cart merge error:', error);
    res.status(500).json({ success: false, message: 'Failed to merge cart' });
  }
};


// Helper to fetch cart data (reused by getCart and addToCart)
const getCartDataInternal = async (userId, cartType = 'personal') => {
  const { Cart, Product, User, FastFood, Service, ServiceImage } = require('../models');
  const { calculateItemCommission } = require('../utils/commissionUtils');

  const cartItems = await Cart.findAll({
    where: { userId, cartType },
    include: [
      {
        model: Product,
        as: 'product',
        required: false,
        attributes: ['id', 'name', 'stock', 'approved', 'displayPrice', 'basePrice', 'discountPrice', 'discountPercentage', 'sellerId', 'deliveryFee', 'marketingEnabled', 'marketingCommission', 'marketingCommissionType', 'coverImage', 'variants', 'tags'],
        include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'role'] }]
      },
      {
        model: FastFood,
        as: 'fastFood',
        required: false,
        attributes: [
          'id', 'name', 'mainImage', 'preparationTimeMinutes', 'displayPrice', 'basePrice', 'discountPrice', 'discountPercentage',
          'vendor', 'isAvailable', 'availabilityMode', 'availableFrom', 'availableTo',
          'availabilityDays', 'isActive', 'approved',
          'deliveryFee', 'marketingEnabled', 'marketingCommission', 'marketingCommissionType',
          'sizeVariants', 'comboOptions'
        ],
        include: [{ model: User, as: 'vendorDetail', attributes: ['id', 'name'] }]
      },
      {
        model: Service,
        as: 'service',
        required: false,
        attributes: ['id', 'title', 'price', 'displayPrice', 'basePrice', 'isAvailable', 'marketingEnabled', 'marketingCommission', 'marketingCommissionType', 'deliveryFee', 'userId', 'status'],
        include: [
          { model: ServiceImage, as: 'images', attributes: ['imageUrl'] },
          { model: User, as: 'provider', attributes: ['id', 'name', 'role'] }
        ]
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  // Valid items check
  const validItems = cartItems.filter(item => {
    let isValid = false;
    let reason = 'Unknown';

    if (item.itemType === 'fastfood') {
      isValid = !!item.fastFood;
      if (!isValid) reason = 'Missing FastFood data (ID: ' + item.fastFoodId + ')';
    } else if (item.itemType === 'service') {
      // EXCLUDE SERVICES COMPLETELY
      isValid = false;
      reason = 'Services are temporarily disabled in cart';
    } else {
      // Product
      const hasProduct = !!item.product;
      const isApproved = hasProduct && item.product.approved;
      isValid = isApproved;
      if (!hasProduct) reason = 'Missing Product data (ID: ' + item.productId + ')';
      else if (!isApproved) reason = 'Product not approved (ID: ' + item.productId + ')';
    }

    if (!isValid) {
      // console.warn(`⚠️ [CART FILTER] Excluding item ID ${item.id} (${item.itemType}). Reason: ${reason}`);
    }
    return isValid;
  });

  // Calculate totals & Commission
  let subtotal = 0;
  let totalCommission = 0;
  let totalDeliveryFee = 0;

  validItems.forEach((item) => {
    try {
      // Enrich cart item with human-readable variant/combo labels for frontend rendering.
      let resolvedVariantName = null;
      let resolvedComboName = null;

      if (item.variantId) {
        const variants = getItemVariants(item.itemType === 'fastfood' ? item.fastFood : item.product, item.itemType === 'fastfood');
        const matchedVariant = findVariantById(variants, item.variantId);
        resolvedVariantName = getVariantDisplayName(matchedVariant, item.variantId);
      }

      if (item.itemType === 'fastfood' && item.comboId && item.fastFood) {
        const combos = parseMaybeJson(item.fastFood.comboOptions, []);
        const combo = Array.isArray(combos)
          ? combos.find((c) => c && (String(c.id || '').toLowerCase() === String(item.comboId).toLowerCase() || String(c.name || '').toLowerCase() === String(item.comboId).toLowerCase()))
          : null;
        resolvedComboName = combo?.name || item.comboId;
      }

      if (resolvedVariantName) item.setDataValue('variantName', resolvedVariantName);
      if (resolvedComboName) item.setDataValue('comboName', resolvedComboName);

      subtotal += Number(item.total || 0);

      const itemDetails = item.itemType === 'fastfood' ? item.fastFood : (item.itemType === 'service' ? item.service : item.product);

      if (!itemDetails) return;

      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);

      // Recalculate commission if stale
      let currentCommission = 0;
      try {
        currentCommission = calculateItemCommission(itemDetails, price, quantity);
      } catch (commError) {
        currentCommission = 0;
      }

      item.setDataValue('itemCommission', currentCommission);
      totalCommission += currentCommission;

      if (item.itemType === 'fastfood') {
        // PRIORITIZE LIVE DATA: Use fastFood model's fee if it exists
        const lineDeliveryFee = item.fastFood?.deliveryFee !== null && item.fastFood?.deliveryFee !== undefined 
          ? Number(item.fastFood.deliveryFee) 
          : Number(item.deliveryFee || 0);
        item.setDataValue('deliveryFee', lineDeliveryFee);
      } else {
        // Derive unit fee from joined data for robustness
        let unitFee = 0;
        if (item.itemType === 'service' && item.service) {
          unitFee = Number(item.service.deliveryFee || 0);
        } else if (item.product) {
          unitFee = Number(item.product.deliveryFee || 0);
        } else {
          unitFee = (item.deliveryFee || 0) / (quantity || 1);
        }

        const lineDeliveryFee = unitFee * quantity;
        item.setDataValue('deliveryFee', lineDeliveryFee);
      }
    } catch (itemError) {
      console.error(`⚠️ [CART LOOP] Error processing item ${item.id}:`, itemError);
    }
  });

  totalDeliveryFee = calculateGroupedDeliveryFee(validItems);

  const summary = {
    subtotal,
    deliveryFee: totalDeliveryFee,
    totalCommission,
    total: subtotal + totalDeliveryFee,
    itemCount: validItems.length // Refined: use unique item count (skus) instead of quantity sum
  };

  return { items: validItems, summary };
};

const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, fastFoodId, serviceId, quantity = 1, type = 'product', cartType = 'personal', variantId, comboId, batchId } = req.body;

    console.log('🛒 [CART DEBUG] addToCart Request:', {
      userId,
      userRole: req.user.role,
      isVerified: req.user.isVerified,
      body: req.body
    });

    const isFastFood = type === 'fastfood';
    const isService = type === 'service';

    // Determine item ID based on type
    let itemId;
    if (isFastFood) itemId = fastFoodId;
    else if (isService) itemId = serviceId;
    else itemId = productId;

    const parsedId = parseInt(itemId);
    const parsedQuantity = parseInt(quantity) || 1;

    if (!itemId) {
      console.warn('⚠️ [addToCart] 400 Error: Item ID is required', { body: req.body });
      return res.status(400).json({ success: false, message: 'Item ID is required' });
    }
    if (parsedQuantity < 1) {
      console.warn('⚠️ [addToCart] 400 Error: Quantity must be at least 1', { quantity: parsedQuantity });
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    let itemDetails;
    let price = 0;
    let stock = 999;

    if (isFastFood) {
      console.log('🍔 [CART DEBUG] Looking for FastFood item:', parsedId);
      const { FastFood } = require('../models');
      itemDetails = await FastFood.findByPk(parsedId);
      console.log('🍔 [CART DEBUG] FastFood found:', itemDetails ? { id: itemDetails.id, name: itemDetails.name, price: itemDetails.displayPrice } : 'NOT FOUND');

      if (!itemDetails) {
        return res.status(404).json({ success: false, message: 'Fast Food item not found' });
      }

      // Use new utility to check availability
      const isOpen = isFastFoodOpen(itemDetails);

      if (!isOpen || !itemDetails.isActive || !itemDetails.approved) {
        console.log(`❌ [addToCart] Availability Check Failed for Item ${fastFoodId}:`, {
          isOpen,
          isActive: itemDetails.isActive,
          approved: itemDetails.approved,
          availabilityMode: itemDetails.availabilityMode
        });
      }

      // FastFood must be open, active, and approved
      if (!isOpen) {
        return res.status(400).json({ success: false, message: 'Item is currently closed (check availability hours)' });
      }
      if (!itemDetails.isActive) {
        console.warn('⚠️ [addToCart] 400 Error: FastFood inactive', { id: parsedId });
        return res.status(400).json({ success: false, message: 'Item is currently inactive' });
      }
      if (!itemDetails.approved) {
        console.warn('⚠️ [addToCart] 400 Error: FastFood unapproved', { id: parsedId });
        return res.status(400).json({ success: false, message: 'Item is waiting for approval' });
      }

      price = Number(itemDetails.discountPrice || itemDetails.displayPrice || itemDetails.basePrice || 0);

      // Handle Variant Price (Works for both FastFood 'sizeVariants' and Product 'variants')
      if (variantId) {
        const variantsAttr = itemDetails.sizeVariants || itemDetails.variants;
        const variants = typeof variantsAttr === 'string' ? JSON.parse(variantsAttr || '[]') : (variantsAttr || []);
        if (Array.isArray(variants)) {
          const variant = variants.find(v =>
            (v.id && String(v.id) === String(variantId)) ||
            (v.name && String(v.name).toLowerCase() === String(variantId).toLowerCase()) ||
            (v.size && String(v.size).toLowerCase() === String(variantId).toLowerCase())
          );
          if (variant) {
            price = Number(variant.discountPrice || variant.displayPrice || variant.basePrice || price);
            console.log(`📦 [CART DEBUG] Using Variant Price: ${price} for variant: ${variantId}`);
          } else {
            console.warn(`⚠️ [CART DEBUG] Variant ${variantId} not found in metadata for item ${itemDetails.id}`);
          }
        }
      }

      // Handle Combo Price
      if (comboId) {
        const combosAttr = itemDetails.comboOptions;
        const combos = typeof combosAttr === 'string' ? JSON.parse(combosAttr || '[]') : (combosAttr || []);
        if (Array.isArray(combos)) {
          const combo = combos.find(c =>
            (c.id && String(c.id) === String(comboId)) ||
            (c.name && String(c.name).toLowerCase() === String(comboId).toLowerCase())
          );
          if (combo) {
            price = Number(combo.discountPrice || combo.displayPrice || combo.basePrice || price);
            console.log(`📦 [CART DEBUG] Using Combo Price: ${price} for combo: ${comboId}`);
          } else {
            console.warn(`⚠️ [CART DEBUG] Combo ${comboId} not found in metadata for item ${itemDetails.id}`);
          }
        }
      }

    } else if (isService) {
      // BLOCK SERVICES
      return res.status(400).json({ success: false, message: 'Services cannot be added to cart at this time.' });

      /* 
      console.log('🛠️ [CART DEBUG] Looking for Service item:', parsedId);
      const { Service } = require('../models');
      itemDetails = await Service.findByPk(parsedId);
      console.log('🛠️ [CART DEBUG] Service found:', itemDetails ? { id: itemDetails.id, name: itemDetails.name, price: itemDetails.price } : 'NOT FOUND');

      if (!itemDetails) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }
      if (!itemDetails.isAvailable) { // Assuming services have isAvailable flag
        return res.status(400).json({ success: false, message: 'Service is currently unavailable' });
      }

      // Services might use 'price' or 'basePrice' depending on model, defaulting to standard lookup
      price = Number(itemDetails.discountPrice || itemDetails.displayPrice || itemDetails.basePrice || itemDetails.price || 0);

      // Services usually don't track stock in the same way, keeping default 999
      */
    } else {
      itemDetails = await Product.findOne({
        where: { id: parsedId, approved: true }
      });

      if (!itemDetails) {
        return res.status(404).json({ success: false, message: 'Product not found or not available' });
      }

      price = Number(itemDetails.discountPrice || itemDetails.displayPrice || itemDetails.basePrice || itemDetails.price || 0);
      stock = itemDetails.stock;

      // Support product variants from either product.variants or tags.variants
      if (variantId) {
        const variants = getItemVariants(itemDetails, false);
        const variant = findVariantById(variants, variantId);
        if (variant) {
          price = Number(variant.discountPrice || variant.displayPrice || variant.basePrice || price);
        } else {
          console.warn(`⚠️ [CART DEBUG] Product variant ${variantId} not found for product ${itemDetails.id}`);
        }
      }

      if (stock < parsedQuantity) {
        console.warn('⚠️ [addToCart] 400 Error: Insufficient stock', { id: parsedId, stock, quantity: parsedQuantity });
        return res.status(400).json({ success: false, message: `Insufficient stock.Only ${stock} available.` });
      }
    }

    if (price <= 0) {
      console.warn('⚠️ [addToCart] 400 Error: Invalid price', { id: parsedId, price });
      return res.status(400).json({ success: false, message: 'Item has invalid price' });
    }

    const total = price * parsedQuantity;

    // Fastfood delivery fee is charged once per seller, not per quantity.
    const itemDeliveryFee = Number(itemDetails.deliveryFee || 0);
    const totalDeliveryFee = isFastFood ? itemDeliveryFee : itemDeliveryFee * parsedQuantity;

    // Calculate item commission (total commission for this cart item) using centralized utility
    const itemCommission = calculateItemCommission(itemDetails, price, parsedQuantity);

    console.log('💰 [CART DEBUG] Calculated values:', { price, quantity: parsedQuantity, total, itemDeliveryFee, totalDeliveryFee, itemCommission });

    const query = { userId, cartType };
    if (isFastFood) {
      query.fastFoodId = parsedId;
      query.itemType = 'fastfood';
      query.variantId = variantId || null;
      query.comboId = comboId || null;
      query.batchId = batchId || null;
    } else if (isService) {
      query.serviceId = parsedId;
      query.itemType = 'service';
    } else {
      query.productId = parsedId;
      query.itemType = 'product';
      query.variantId = variantId || null;
    }

    const existingCartItem = await Cart.findOne({ where: query });

    if (existingCartItem) {
      // Item already in cart - don't increment quantity
      // Quantity should only be changed via +/- buttons in cart page
      console.log(`ℹ️ [CART DEBUG] Item already in cart (ID: ${existingCartItem.id}). Not incrementing quantity.`);

      return res.json({
        success: true,
        message: 'Item already in cart',
        item: existingCartItem,
        alreadyInCart: true
      });
    } else {
      const cartPayload = {
        userId,
        quantity: parsedQuantity,
        price,
        total,
        deliveryFee: totalDeliveryFee,
        itemCommission,
        cartType,
        itemType: isFastFood ? 'fastfood' : (isService ? 'service' : 'product'),
        variantId: variantId || null,
        comboId: comboId || null,
        batchId: batchId || null
      };

      if (isFastFood) {
        cartPayload.fastFoodId = parsedId;
      } else if (isService) {
        cartPayload.serviceId = parsedId;
      } else {
        cartPayload.productId = parsedId;
      }

      console.log('✅ [CART DEBUG] Creating new cart item:', cartPayload);
      const cartItem = await Cart.create(cartPayload);
      console.log('✅ [CART DEBUG] Cart item created successfully:', cartItem.id);

      const cartData = await getCartDataInternal(userId, cartType);

      return res.status(201).json({
        success: true,
        message: 'Item added to cart successfully',
        // Return full cart data to update frontend immediately
        items: cartData.items,
        summary: cartData.summary,
        // Also keep 'item' for backward compatibility if needed, but preferably full cart
        item: cartItem
      });
    }

  } catch (error) {
    console.error('❌ [CART DEBUG] Error adding to cart:', error);
    console.error('❌ [CART DEBUG] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error.message
    });
  }
};

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartType = 'personal' } = req.query;
    const cartData = await getCartDataInternal(userId, cartType);

    const responseData = {
      success: true,
      items: cartData.items,
      summary: cartData.summary
    };

    console.log(`🛒 [CART DEBUG] Final JSON sent for userId ${userId}:`, JSON.stringify(responseData.summary, null, 2));

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching cart:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', { userId: req.user?.id, query: req.query });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error.message
    });
  }
};



// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, type = 'product', cartType = 'personal', variantId, comboId } = req.body;

    // productId here is generic ID (either product or fastfood ID)
    if (!productId || quantity < 0) {
      console.warn('⚠️ [updateCartItem] 400 Error: Invalid ID or quantity', { body: req.body });
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID or quantity'
      });
    }

    const isFastFood = type === 'fastfood';
    const isService = type === 'service';
    const query = { userId, cartType };
    if (isFastFood) {
      query.fastFoodId = productId;
      query.itemType = 'fastfood';
      query.variantId = variantId || null;
      query.comboId = comboId || null;
    } else if (isService) {
      query.serviceId = productId;
      query.itemType = 'service';
    } else {
      query.productId = productId;
      query.itemType = 'product';
      query.variantId = variantId || null;
    }

    const { FastFood, Service } = require('../models');

    const cartItem = await Cart.findOne({
      where: query,
      include: [
        { model: Product, as: 'product', required: false },
        { model: FastFood, as: 'fastFood', required: false },
        { model: Service, as: 'service', required: false }
      ]
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    if (quantity === 0) {
      await cartItem.destroy();
      return res.json({
        success: true,
        message: 'Item removed from cart'
      });
    }

    // Check stock and get price/commission details
    let stock = 9999;
    let price = 0;
    let marketingCommission = 0;
    let marketingCommissionType = 'percentage';

    if (isFastFood) {
      if (cartItem.fastFood) {
        stock = 999; // Unlimited for now
        if (cartItem.fastFood.maxOrderQty) stock = cartItem.fastFood.maxOrderQty;

        price = Number(cartItem.fastFood.discountPrice || cartItem.fastFood.displayPrice || cartItem.fastFood.basePrice || 0);

        // Handle Variant Price
        if (cartItem.variantId) {
          const variants = typeof cartItem.fastFood.sizeVariants === 'string' ? JSON.parse(cartItem.fastFood.sizeVariants) : (cartItem.fastFood.sizeVariants || []);
          if (Array.isArray(variants)) {
            const variant = variants.find(v => (v.id && String(v.id) === String(cartItem.variantId)) || (v.name && String(v.name).toLowerCase() === String(cartItem.variantId).toLowerCase()) || (v.size && String(v.size).toLowerCase() === String(cartItem.variantId).toLowerCase()));
            if (variant) price = Number(variant.discountPrice || variant.displayPrice || variant.basePrice || price);
          }
        }

        // Handle Combo Price
        if (cartItem.comboId) {
          const combos = typeof cartItem.fastFood.comboOptions === 'string' ? JSON.parse(cartItem.fastFood.comboOptions) : (cartItem.fastFood.comboOptions || []);
          if (Array.isArray(combos)) {
            const combo = combos.find(c => (c.id && String(c.id) === String(cartItem.comboId)) || (c.name && String(c.name).toLowerCase() === String(cartItem.comboId).toLowerCase()));
            if (combo) price = Number(combo.discountPrice || combo.displayPrice || combo.basePrice || price);
          }
        }

        marketingCommission = Number(cartItem.fastFood.marketingCommission || 0);
        marketingCommissionType = cartItem.fastFood.marketingCommissionType || 'percentage';
      }
    } else if (isService) {
      if (cartItem.service) {
        stock = 999; // Unlimited for Services
        price = Number(cartItem.service.displayPrice || cartItem.service.basePrice || cartItem.service.price || 0);
        marketingCommission = Number(cartItem.service.marketingCommission || 0);
        marketingCommissionType = cartItem.service.marketingCommissionType || 'percentage';
      }
    } else {
      if (cartItem.product) {
        stock = cartItem.product.stock;
        price = Number(cartItem.product.discountPrice || cartItem.product.displayPrice || cartItem.product.basePrice || 0);

        // Handle Variant Price for Products
        if (cartItem.variantId) {
          const variants = getItemVariants(cartItem.product, false);
          const variant = findVariantById(variants, cartItem.variantId);
          if (variant) price = Number(variant.discountPrice || variant.displayPrice || variant.basePrice || price);
        }

        marketingCommission = Number(cartItem.product.marketingCommission || 0);
        marketingCommissionType = cartItem.product.marketingCommissionType || 'percentage';
      }
    }

    if (stock < quantity) {
      console.warn('⚠️ [updateCartItem] 400 Error: Insufficient stock', { id: productId, stock, quantity });
      return res.status(400).json({
        success: false,
        message: `Only ${stock} items available`
      });
    }

    const total = price * quantity;

    // Recalculate item commission and delivery fee
    const itemDetails = isFastFood ? cartItem.fastFood : (isService ? cartItem.service : cartItem.product);
    const itemCommission = calculateItemCommission(itemDetails, price, quantity);
    const itemDeliveryFee = Number(itemDetails?.deliveryFee || 0);
    const totalDeliveryFee = isFastFood ? itemDeliveryFee : itemDeliveryFee * quantity;

    console.log('💰 [CART DEBUG] Recalculated values in updateCartItem:', { price, quantity, total, itemCommission, totalDeliveryFee });

    await cartItem.update({
      quantity,
      price, // Update price in case it changed
      total,
      itemCommission,
      deliveryFee: totalDeliveryFee
    });

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      item: cartItem
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error.message
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params; // logic id
    const { type = 'product', cartType = 'personal', variantId, comboId, batchId } = req.query; // Pass type and cartType in query param for DELETE

    const isFastFood = type === 'fastfood';
    const query = { userId, cartType };

    if (isFastFood) {
      query.fastFoodId = parseInt(productId);
      query.itemType = 'fastfood';
      query.variantId = variantId || null;
      query.comboId = comboId || null;
      query.batchId = batchId || null;
    } else if (type === 'service') {
      query.serviceId = parseInt(productId);
      query.itemType = 'service';
    } else {
      query.productId = parseInt(productId);
      query.itemType = 'product';
      query.variantId = variantId || null;
    }

    const cartItem = await Cart.findOne({ where: query });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    await cartItem.destroy();

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message
    });
  }
};

// Set one shared batch for all fastfood items in the current cart scope
const setFastFoodOrderBatch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { batchId, cartType = 'personal' } = req.body;

    const parsedBatchId = parseInt(batchId, 10);
    if (!parsedBatchId || Number.isNaN(parsedBatchId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid batchId is required'
      });
    }

    const { Batch } = require('../models');
    const batch = await Batch.findByPk(parsedBatchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const status = String(batch.status || '').toLowerCase();
    if (!['scheduled', 'in progress', 'in_progress'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Selected batch is not active'
      });
    }

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (batch.startTime && currentTimeStr < batch.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Selected batch has not started yet'
      });
    }

    if (batch.endTime && currentTimeStr > batch.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Selected batch has already ended'
      });
    }

    const [updatedCount] = await Cart.update(
      { batchId: parsedBatchId },
      {
        where: {
          userId,
          cartType,
          itemType: 'fastfood'
        }
      }
    );

    return res.json({
      success: true,
      message: 'Order batch updated for fastfood cart items',
      updatedCount,
      batchId: parsedBatchId
    });
  } catch (error) {
    console.error('Error setting fastfood order batch:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to set order batch',
      error: error.message
    });
  }
};


// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartType = 'personal' } = req.query;

    await Cart.destroy({
      where: { userId, cartType }
    });

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
};

// Get cart count for navbar
const getCartCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartType = 'personal' } = req.query;

    const cartItems = await Cart.findAll({
      where: { userId, cartType },
      attributes: ['quantity']
    });

    const totalCount = cartItems.length; // Refined: unique item count (skus)

    res.json({
      success: true,
      count: totalCount
    });
  } catch (error) {
    console.error('Error getting cart count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cart count',
      error: error.message
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  setFastFoodOrderBatch,
  clearCart,
  mergeCart,
  getCartCount
};
