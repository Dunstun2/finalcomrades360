const { Product, FastFood, User, Order, OrderItem, Commission, PickupStation, DeliveryCharge, PlatformConfig, DeliveryTask, Wallet, PromoCode } = require('../models');
const { autoCreateDeliveryTask } = require('./orderTransitionController');
const { calculateCommission } = require('./commissionController');
const { creditPending } = require('../utils/walletHelpers');
const { Op } = require('sequelize');
const { calculateItemCommission } = require('../utils/commissionUtils');
const { notifyCustomerOrderPlaced, notifyMarketerOrderPlaced, notifySellerOrderPlaced } = require('../utils/notificationHelpers');
const { sequelize } = require('../database/database');
const { normalizeKenyanPhone } = require('../middleware/validators');
const { isFastFoodOpen } = require('../utils/fastFoodUtils');

/**
 * Determines if a string is likely an address based on patterns
 */
function isLikelyAddress(str) {
  const trimmed = str.toLowerCase().trim();
  if (trimmed.length < 2) return false;

  // Pure numbers (like house numbers) - any length
  if (/^\d+$/.test(trimmed)) return true;

  // Letter + number like K8, A1, etc. - any length
  if (/^[a-z]\d+/.test(trimmed)) return true;

  // Number + letter - any length
  if (/^\d+[a-z]+/.test(trimmed)) return true;

  // Mixed alphanumeric (contains both letters and numbers)
  if (/^[a-z\d\s\-\,\.\/]+$/i.test(trimmed) && /[a-z]/.test(trimmed) && /\d/.test(trimmed)) return true;

  // Address keywords - expanded list
  const keywords = ['nyayo', 'nyao', 'km', 'hostel', 'room', 'house', 'apt', 'unit', 'block', 'estate', 'gate', 'stage', 'shop', 'market', 'plaza', 'building', 'floor', 'hall', 'kili', 'junction', 'road', 'rd', 'street', 'st', 'ave', 'avenue', 'lane', 'ln', 'drive', 'dr', 'close', 'court', 'place', 'plaza', 'centre', 'center', 'mall', 'market', 'building', 'floor', 'hall', 'phase', 'section', 'zone', 'area', 'village', 'town', 'city', 'cbd', 'westlands', 'kilimani', 'koinange', 'luthuli', 'tom mboya', 'river road', 'koinange street', ' Moi avenue', 'haile selassie', 'standard street', 'agakhan walk', 'parklands', 'chiromo', 'hurligham', 'kilimani', 'kileleshwa', 'langata', ' Karen', 'madaraka', 'mombasa road', 'ngong road', 'outering road', 'waiyaki way', 'limuru road', 'kiambu road', 'thika road', 'jogoo road', 'luthuli avenue', 'university way', 'koinange street', 'tom mboya street', 'government road', 'station road'];
  if (keywords.some(k => trimmed.includes(k))) return true;

  // Contains commas, slashes, or multiple spaces (likely address format)
  if (trimmed.includes(',') || trimmed.includes('/') || trimmed.split(' ').length > 3) return true;

  // If it contains location indicators
  if (trimmed.includes('nairobi') || trimmed.includes('mombasa') || trimmed.includes('kisumu') || trimmed.includes('nakuru') || trimmed.includes('eldoret')) return true;

  return false;
}

/**
 * List all direct orders (orderNumber starts with 'DIR-')
 * Admin: sees all. Marketer: sees their own. Seller: sees orders with their sellerId.
 */
exports.listDirectOrders = async (req, res) => {
    try {
        const role = req.user.role;
        const roles = req.user.roles || [];
        const userId = req.user.id;
        
        const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin' || roles.some(r => ['admin', 'superadmin', 'super_admin'].includes(r));
        const isMarketer = role === 'marketer' || roles.includes('marketer');
        const isSeller = role === 'seller' || roles.includes('seller');

        console.log(`[DirectOrder] List request by User ${userId} | Role: ${role} | isAdmin: ${isAdmin} | isMarketer: ${isMarketer}`);

        const baseWhere = {
            orderNumber: { [Op.like]: 'DIR-%' }
        };

        // If NOT an admin, enforce strict ownership/placer filtering
        if (!isAdmin) {
            if (isMarketer) {
                baseWhere.marketerId = userId;
            } else if (isSeller) {
                baseWhere.sellerId = userId;
            } else {
                // If neither, they shouldn't see anything or at least only their own (as customer)
                // But DirectOrders is for management, so we'll be restrictive
                baseWhere.userId = userId;
                baseWhere.marketerId = userId; // Should result in empty if not both
            }
        }
        // Admin sees all based on DIR- prefix

        const orders = await Order.findAll({
            where: baseWhere,
            include: [
                {
                    model: OrderItem,
                    as: 'OrderItems',
                    attributes: ['id', 'name', 'quantity', 'price', 'total', 'variantId', 'comboId']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone', 'email'],
                    required: false
                },
                {
                    model: User,
                    as: 'seller',
                    attributes: ['id', 'name', 'phone', 'businessName', 'role'],
                    required: false
                },
                {
                    model: User,
                    as: 'marketer',
                    attributes: ['id', 'name', 'phone', 'role'],
                    required: false
                },
                {
                    model: DeliveryTask,
                    as: 'deliveryTasks',
                    include: [{ model: User, as: 'deliveryAgent', attributes: ['id', 'name', 'phone'] }],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 100
        });

        res.json({ success: true, orders });
    } catch (error) {
        console.error('[directOrderController] listDirectOrders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch direct orders' });
    }
};


/**
 * Parses a single order block
 * Format:
 * Item Name(Qty)
 * Phone Number
 * Address
 */
const phoneRegex = /(\+?254|0)?(7|1)\d{8}/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseTextBlock = (text) => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 1) return null;

    let customerPhone = '';
    let customerEmail = '';
    let pickupPoint = '';
    const candidates = [];

    for (const line of lines) {
        const lower = line.toLowerCase();
        if (!customerPhone && phoneRegex.test(line.replace(/\s+/g, ''))) {
            customerPhone = line.replace(/\s+/g, '').match(phoneRegex)[0];
        } else if (!customerEmail && emailRegex.test(line)) {
            customerEmail = line;
        } else if (!pickupPoint && (lower.startsWith('pickup:') || lower.startsWith('station:') || lower.startsWith('point:'))) {
            pickupPoint = line.split(':')[1].trim();
        } else {
            // Updated regex to support: Item(Qty), Item (Qty), Item Qty, or just Item
            // Matches "Bhajia(2)", "Bhajia (2)", "Bhajia 2" or "Bhajia"
            const itemMatch = line.match(/^(.+?)(?:\s*(?:\(\s*(\d+)\s*\)|(\d+))\s*)?$/);
            
            candidates.push({
                name: itemMatch ? itemMatch[1].trim() : line,
                quantity: (itemMatch && (itemMatch[2] || itemMatch[3])) ? parseInt(itemMatch[2] || itemMatch[3], 10) : 1,
                original: line
            });
        }
    }

    // Normalization
    if (customerPhone.startsWith('0')) customerPhone = '254' + customerPhone.slice(1);
    if (customerPhone.startsWith('7') || customerPhone.startsWith('1')) customerPhone = '254' + customerPhone;
    if (customerPhone.startsWith('+')) customerPhone = customerPhone.slice(1);
    const normalizedPhone = normalizeKenyanPhone(customerPhone) || normalizeKenyanPhone('+' + customerPhone) || customerPhone;

    return {
        candidates,
        customerPhone: normalizedPhone,
        customerEmail,
        pickupPoint,
        allLines: lines
    };
};

exports.parseDirectOrder = async (req, res) => {
    try {
        const { textBlock, type } = req.body; // type: 'product' or 'fastfood'
        console.log('[DirectOrder] Received Text Block:', textBlock);
        
        if (!textBlock) {
            return res.status(400).json({ success: false, message: 'Text block is required' });
        }

        const parsed = parseTextBlock(textBlock);
        if (!parsed || parsed.candidates.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid format. Ensure at least one line for the item name.' 
            });
        }

        // 1. Process all candidates to find matches for each
        const filteredCandidates = parsed.candidates.filter(c => !isLikelyAddress(c.name));

        console.log(`[DirectOrder] Filtered ${parsed.candidates.length} candidates to ${filteredCandidates.length} after address filtering`);

        const detectedItems = [];

        for (const candidate of filteredCandidates) {
            // Search only the selected type table for better accuracy
            let searchPromises = [];
            if (type === 'fastfood') {
                searchPromises = [
                    FastFood.findAll({
                        where: {
                            [Op.or]: [
                                { name: { [Op.like]: `%${candidate.name}%` } },
                                { sizeVariants: { [Op.like]: `%${candidate.name}%` } }
                            ],
                            reviewStatus: 'approved',
                            isActive: true
                        },
                        limit: 10
                    }),
                    Promise.resolve([])
                ];
            } else {
                searchPromises = [
                    Promise.resolve([]),
                    Product.findAll({
                        where: {
                            name: { [Op.like]: `%${candidate.name}%` },
                            reviewStatus: 'approved',
                            status: 'active'
                        },
                        limit: 10
                    })
                ];
            }

            const [ffMatches, prodMatches] = await Promise.all(searchPromises);
            const rawMatches = [...ffMatches, ...prodMatches].filter(m => m);

            let itemMatches = [];

            if (rawMatches.length > 0) {
                const searchLower = candidate.name.toLowerCase();
                console.log(`[DirectOrder] Candidate "${candidate.name}" found ${rawMatches.length} raw DB results`);
                
                for (const m of rawMatches) {
                    const isFF = !!m.vendor;
                    const mNameLower = m.name.toLowerCase();
                    
                    // Stricter matching: item name must contain the full candidate name (case-insensitive)
                    // Only match if candidate is at least 2 characters to avoid single letter matches
                    if (searchLower.length >= 2 && mNameLower.includes(searchLower)) {
                        itemMatches.push({ 
                            id: m.id.toString(), 
                            name: m.name, 
                            price: m.displayPrice || m.basePrice, 
                            sellerId: isFF ? m.vendor : m.sellerId,
                            type: isFF ? 'fastfood' : 'product',
                            isOpen: isFF ? isFastFoodOpen(m) : true
                        });
                    }

                    // Variants (FF only) - also require full candidate match
                    if (isFF && searchLower.length >= 2) {
                        let variants = [];
                        try { variants = typeof m.sizeVariants === 'string' ? JSON.parse(m.sizeVariants) : (m.sizeVariants || []); } catch(e){}
                        for (const v of variants) {
                            const vName = v.name || v.size || '';
                            if (vName.toLowerCase().includes(searchLower)) {
                                itemMatches.push({ 
                                    id: `${m.id}_variant_${v.id || vName}`, 
                                    name: `${m.name} (${vName})`, 
                                    price: v.discountPrice || v.displayPrice || m.displayPrice, 
                                    sellerId: m.vendor, 
                                    type: 'fastfood',
                                    isOpen: isFastFoodOpen(m)
                                });
                            }
                        }
                        
                        let combos = [];
                        try { combos = typeof m.comboOptions === 'string' ? JSON.parse(m.comboOptions) : (m.comboOptions || []); } catch(e){}
                        for (const c of combos) {
                            const cName = c.name || c.title || '';
                            if (cName.toLowerCase().includes(searchLower)) {
                                itemMatches.push({ 
                                    id: `${m.id}_combo_${c.id || cName}`, 
                                    name: `${m.name} (${cName})`, 
                                    price: c.discountPrice || c.displayPrice || m.displayPrice, 
                                    sellerId: m.vendor, 
                                    type: 'fastfood',
                                    isOpen: isFastFoodOpen(m)
                                });
                            }
                        }
                    }
                }
            }

            // Logic:
            // 1. If we found system matches, it's definitely an item.
            // 2. If it has explicit quantity like (2), it's definitely an item.
            // Since candidates are already filtered to exclude likely addresses, 
            // we can be more confident in including them if they have matches or explicit qty.
            if (itemMatches.length > 0 || candidate.original.includes('(') || candidate.original.includes(')')) {
                detectedItems.push({
                    name: candidate.name,
                    quantity: candidate.quantity,
                    original: candidate.original,
                    matches: itemMatches,
                    selectedId: itemMatches.length > 0 ? itemMatches[0].id : null,
                    type: itemMatches.length > 0 ? itemMatches[0].type : type
                });
            }
        }

        console.log(`[DirectOrder] Final detected items: ${detectedItems.length} from ${parsed.candidates.length} candidates`);

        // 3. Smart Heuristic for Customer Name and Address (using remaining lines)
        const usedLines = new Set(detectedItems.map(di => di.original));
        const remaining = parsed.allLines.filter(line => !usedLines.has(line));
        let customerName = '';
        let addressLines = [];

        console.log('[DirectOrder] Remaining lines for address:', remaining);

        if (remaining.length > 0) {
            // Separate phone/email lines from address lines
            const phoneLines = [];
            const emailLines = [];
            const potentialAddressLines = [];

            for (const line of remaining) {
                const trimmed = line.trim();
                if (phoneRegex.test(trimmed.replace(/\s+/g, ''))) {
                    phoneLines.push(trimmed);
                } else if (emailRegex.test(trimmed)) {
                    emailLines.push(trimmed);
                } else {
                    potentialAddressLines.push(trimmed);
                }
            }

            // Use potential address lines, but if none found, use all remaining lines
            addressLines = potentialAddressLines.length > 0 ? potentialAddressLines : remaining;

            console.log('[DirectOrder] Identified address lines:', addressLines);
        }

        // If still no address, try to find address-like lines from all original lines
        if (addressLines.length === 0) {
            const allAddressLike = parsed.allLines.filter(line => isLikelyAddress(line));
            if (allAddressLike.length > 0) {
                addressLines = allAddressLike;
                console.log('[DirectOrder] Fallback: found address-like lines:', addressLines);
            }
        }

        const finalParsed = {
            items: detectedItems,
            customerPhone: parsed.customerPhone,
            customerName: customerName,
            customerEmail: parsed.customerEmail,
            deliveryAddress: addressLines.join(', ').trim() || 'N/A'
        };

        console.log('[DirectOrder] Final parsed data:', {
            itemsCount: detectedItems.length,
            phone: finalParsed.customerPhone,
            address: finalParsed.deliveryAddress,
            addressLines: addressLines
        });

        // Check for conflicts
        let userByPhone = await User.findOne({ where: { phone: finalParsed.customerPhone } });
        let userByEmail = null;
        if (finalParsed.customerEmail) {
            userByEmail = await User.findOne({ where: { email: finalParsed.customerEmail } });
        }

        let user = userByPhone || userByEmail;
        let conflict = (userByPhone && userByEmail && userByPhone.id !== userByEmail.id);

        // Simple Pickup Station Match (only if explicitly prefixed or matches exactly)
        let pickupStation = null;
        if (parsed.pickupPoint) {
            pickupStation = await PickupStation.findOne({ where: { name: { [Op.like]: `%${parsed.pickupPoint}%` }, isActive: true } });
        }

        res.json({
            success: true,
            parsedData: finalParsed,
            userExists: !!user,
            userConflict: conflict,
            suggestedPickupStation: pickupStation ? { id: pickupStation.id, name: pickupStation.name, price: pickupStation.price } : null
        });

    } catch (error) {
        console.error('[directOrderController] parse error:', error);
        res.status(500).json({ success: false, message: 'Failed to parse order' });
    }
};

exports.placeDirectOrder = async (req, res) => {
    console.log('[DirectOrder] Place Order Request Received:', req.body);
    const t = await sequelize.transaction();
    try {
        const { 
            items, // Array of { itemId, quantity, type }
            customerPhone,
            deliveryAddress,
            pickupStationId,
            customerName = 'Guest Customer',
            customerEmail,
            originalTextBlock,
            batchId,
            deliveryTimePreference,
            promoCode
        } = req.body;

        const normalizedCustomerPhone = normalizeKenyanPhone(customerPhone) || (customerPhone || '').replace(/\D/g, '');
        const effectiveCustomerPhone = normalizedCustomerPhone || customerPhone;

        // Group items and ensure they have a type (use global fallback if missing)
        const globalType = req.body.type || 'fastfood';
        const finalItems = (Array.isArray(items) ? items : [{ 
            itemId: req.body.itemId, 
            type: req.body.type, 
            quantity: req.body.quantity 
        }]).map(item => ({
            ...item,
            type: item.type || globalType
        }));

        console.log('[DirectOrder] Final Items to process:', finalItems);
        console.log('[DirectOrder] Effective customer phone:', effectiveCustomerPhone);

        if (finalItems.length === 0 || !finalItems[0].itemId) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'At least one item is required.' });
        }

        if (!effectiveCustomerPhone || effectiveCustomerPhone.length < 5) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Valid customer phone number is required.' });
        }

        if (!deliveryAddress || deliveryAddress === 'N/A' || deliveryAddress.trim().length < 3) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Valid delivery address is required.' });
        }

        const role = req.user.role;
        const roles = req.user.roles || [];
        const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin' || roles.some(r => ['admin', 'superadmin', 'super_admin'].includes(r));
        const isMarketer = role === 'marketer' || roles.includes('marketer');

        // 2. Validate Items & Calculate Pricing
        let totalSubtotal = 0;
        let processedItems = [];
        let firstSellerId = null;
        let isFastFoodOrder = false;
        let totalDeliveryFee = 0;
        let sellerEarningsMap = {}; // sellerId -> amount
        const fastFoodQuantities = {};
        const fastFoodBaseFees = {};

        for (const itemRequest of finalItems) {
            let actualItemId = itemRequest.itemId;
            let variantId = null;
            let comboId = null;
            
            if (typeof itemRequest.itemId === 'string') {
                if (itemRequest.itemId.includes('_variant_')) {
                    [actualItemId, variantId] = itemRequest.itemId.split('_variant_');
                } else if (itemRequest.itemId.includes('_combo_')) {
                    [actualItemId, comboId] = itemRequest.itemId.split('_combo_');
                }
            }

            if (itemRequest.type === 'fastfood') isFastFoodOrder = true;
            const model = itemRequest.type === 'fastfood' ? FastFood : Product;
            const dbItem = await model.findByPk(actualItemId);

            if (!dbItem) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `Item not found: ${actualItemId}` });
            }

            // Shop Status & Availability Validation
            if (!dbItem.approved || dbItem.isActive === false) {
                await t.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `Item "${dbItem.name}" is currently not available.` 
                });
            }

            if (itemRequest.type === 'fastfood') {
                const { isFastFoodOpen } = require('../utils/fastFoodUtils');
                if (!isFastFoodOpen(dbItem)) {
                    await t.rollback();
                    return res.status(400).json({ success: false, message: `Kitchen for "${dbItem.name}" is CLOSED.` });
                }
            }

            let unitPrice = parseFloat(dbItem.discountPrice || dbItem.displayPrice || dbItem.basePrice || 0);
            let itemName = dbItem.name;

            if (variantId) {
                let sizeVariants = [];
                try { sizeVariants = typeof dbItem.sizeVariants === 'string' ? JSON.parse(dbItem.sizeVariants) : (dbItem.sizeVariants || []); } catch(e){}
                const v = sizeVariants.find(v => (v.id || v.name || v.size || '') == variantId);
                if (v) {
                    unitPrice = parseFloat(v.discountPrice || v.displayPrice || v.basePrice || unitPrice);
                    const vName = v.name || v.size || variantId;
                    itemName = (vName.length > 5 || vName.toLowerCase().includes(dbItem.name.toLowerCase())) ? vName : `${dbItem.name} (${vName})`;
                }
            } else if (comboId && itemRequest.type === 'fastfood') {
                let comboOptions = [];
                try { comboOptions = typeof dbItem.comboOptions === 'string' ? JSON.parse(dbItem.comboOptions) : (dbItem.comboOptions || []); } catch(e){}
                const c = comboOptions.find(c => (c.id || c.name || c.title || '') == comboId);
                if (c) {
                    unitPrice = parseFloat(c.discountPrice || c.displayPrice || c.basePrice || unitPrice);
                    const cName = c.name || c.title || comboId;
                    itemName = (cName.length > 5 || cName.toLowerCase().includes(dbItem.name.toLowerCase())) ? cName : `${dbItem.name} (${cName})`;
                }
            }

            const subtotal = unitPrice * itemRequest.quantity;
            totalSubtotal += subtotal;
            const sellerId = itemRequest.type === 'fastfood' ? dbItem.vendor : dbItem.sellerId;
            if (!firstSellerId) firstSellerId = sellerId;

            const commissionAmount = calculateItemCommission(dbItem, unitPrice, itemRequest.quantity);

            // Resolve Seller Base Price (The price set by the seller before markups)
            let sellerBasePrice = parseFloat(dbItem.basePrice || 0);
            if (variantId) {
                let sizeVariants = [];
                try { sizeVariants = typeof dbItem.sizeVariants === 'string' ? JSON.parse(dbItem.sizeVariants) : (dbItem.sizeVariants || []); } catch(e){}
                const v = sizeVariants.find(v => (v.id || v.name || v.size || '') == variantId);
                if (v) sellerBasePrice = parseFloat(v.basePrice || sellerBasePrice);
            } else if (comboId && itemRequest.type === 'fastfood') {
                let comboOptions = [];
                try { comboOptions = typeof dbItem.comboOptions === 'string' ? JSON.parse(dbItem.comboOptions) : (dbItem.comboOptions || []); } catch(e){}
                const c = comboOptions.find(c => (c.id || c.name || c.title || '') == comboId);
                if (c) sellerBasePrice = parseFloat(c.basePrice || sellerBasePrice);
            }

            processedItems.push({
                dbItem,
                itemId: actualItemId,
                type: itemRequest.type,
                variantId,
                comboId,
                name: itemName,
                quantity: itemRequest.quantity,
                unitPrice,
                subtotal,
                sellerBasePrice: sellerBasePrice * itemRequest.quantity,
                commissionAmount,
                sellerId,
                deliveryFee: parseFloat(dbItem.deliveryFee || 0)
            });

            const itemDeliveryFee = parseFloat(dbItem.deliveryFee || 0);
            if (itemRequest.type === 'fastfood') {
                const vendorKey = sellerId || 'unknown';
                fastFoodQuantities[vendorKey] = (fastFoodQuantities[vendorKey] || 0) + itemRequest.quantity;
                if (fastFoodBaseFees[vendorKey] === undefined) {
                    fastFoodBaseFees[vendorKey] = itemDeliveryFee;
                }
            } else {
                totalDeliveryFee += itemDeliveryFee * itemRequest.quantity;
            }

            // Track seller earnings (merchandise payout)
            sellerEarningsMap[sellerId] = (sellerEarningsMap[sellerId] || 0) + (sellerBasePrice * itemRequest.quantity);

            // Deduct inventory and update counts
            if (itemRequest.type === 'product') {
                if (dbItem.stock !== undefined) {
                    await dbItem.decrement('stock', { by: itemRequest.quantity, transaction: t });
                }
                // Products use 'soldCount'
                if (dbItem.constructor.rawAttributes.soldCount) {
                    await dbItem.increment('soldCount', { by: itemRequest.quantity, transaction: t });
                }
            } else if (itemRequest.type === 'fastfood') {
                // FastFood uses 'orderCount'
                if (dbItem.constructor.rawAttributes.orderCount) {
                    await dbItem.increment('orderCount', { by: itemRequest.quantity, transaction: t });
                } else if (dbItem.constructor.rawAttributes.soldCount) {
                    await dbItem.increment('soldCount', { by: itemRequest.quantity, transaction: t });
                }
            }
        }

        // Apply fast food incremental fees
        for (const vendorKey in fastFoodQuantities) {
            const qty = fastFoodQuantities[vendorKey];
            const baseFee = fastFoodBaseFees[vendorKey] || 0;
            const incrementalFee = baseFee + (baseFee * 0.55 * Math.max(0, qty - 1));
            totalDeliveryFee += incrementalFee;
            console.log(`🚚 DirectOrder: Applied Fast Food Incremental Fee: ${incrementalFee} for vendor: ${vendorKey} (Base: ${baseFee}, Qty: ${qty})`);
        }

        const sellerId = firstSellerId;
        // Status: ALL direct orders start at super_admin_confirmed to trigger immediate logistics.
        const orderStatus = 'super_admin_confirmed';
        const now = new Date();

        // 1. Resolve User & Check for Identity Conflicts
        const userByPhone = await User.findOne({ where: { phone: effectiveCustomerPhone } });
        let userByEmail = null;
        if (customerEmail) {
            userByEmail = await User.findOne({ where: { email: customerEmail } });
        }

        if (userByPhone && userByEmail && userByPhone.id !== userByEmail.id) {
            await t.rollback();
            return res.status(400).json({ 
                success: false, 
                message: `Identity Conflict: Phone (${effectiveCustomerPhone}) belongs to ${userByPhone.name}, but Email (${customerEmail}) belongs to ${userByEmail.name}.` 
            });
        }

        const user = userByPhone || userByEmail;

        // Validate & Apply Promo Code
        let appliedPromoCode = null;
        let appliedPromoDiscountPercentage = 0;
        let appliedPromoObj = null;

        if (promoCode) {
            const promo = await PromoCode.findOne({ where: { code: promoCode, isActive: true }, transaction: t });
            if (promo) {
                const now = new Date();
                let isPromoValid = true;
                let promoError = '';

                const orderType = type || globalType;
                if (promo.orderType !== 'all' && promo.orderType !== orderType) {
                    isPromoValid = false;
                    promoError = `This promo code is only valid for ${promo.orderType} orders.`;
                }

                if (promo.validFrom && new Date(promo.validFrom) > now) {
                    isPromoValid = false;
                    promoError = 'Promo code not yet active.';
                }
                if (promo.validUntil && new Date(promo.validUntil) < now) {
                    isPromoValid = false;
                    promoError = 'Promo code expired.';
                }
                if (promo.maxUsageLimit && promo.usageCount >= promo.maxUsageLimit) {
                    isPromoValid = false;
                    promoError = 'Promo code usage limit reached.';
                }

                if (isPromoValid && promo.targetAudience === 'new_users') {
                    const effectiveUserId = user ? user.id : null;
                    if (!effectiveUserId) {
                        let hasPreviousOrders = false;
                        if (effectiveCustomerPhone) {
                            const previousOrders = await Order.count({ where: { customerPhone: effectiveCustomerPhone }, transaction: t });
                            if (previousOrders > 0) hasPreviousOrders = true;
                        }
                        if (!hasPreviousOrders && customerEmail) {
                            const previousOrders = await Order.count({ where: { customerEmail: customerEmail.toLowerCase() }, transaction: t });
                            if (previousOrders > 0) hasPreviousOrders = true;
                        }
                        if (hasPreviousOrders) {
                            isPromoValid = false;
                            promoError = 'For new users only. This contact info has been used before.';
                        }
                    } else {
                        const previousOrders = await Order.count({ where: { userId: effectiveUserId }, transaction: t });
                        if (previousOrders > 0) {
                            isPromoValid = false;
                            promoError = 'For new users only.';
                        }
                    }
                }

                if (isPromoValid && (promo.minUserOrderCount > 0 || promo.minUserLifetimeSpend > 0)) {
                    let validOrderCount = 0;
                    let lifetimeSpend = 0;
                    const validStatuses = ['delivered', 'completed'];
                    let whereClause = null;
                    const effectiveUserId = user ? user.id : null;

                    if (effectiveUserId) {
                        whereClause = { userId: effectiveUserId, status: { [Op.in]: validStatuses } };
                    } else {
                        const orConditions = [];
                        if (effectiveCustomerPhone) orConditions.push({ customerPhone: effectiveCustomerPhone });
                        if (customerEmail) orConditions.push({ customerEmail: customerEmail.toLowerCase() });
                        if (orConditions.length > 0) {
                            whereClause = { [Op.or]: orConditions, status: { [Op.in]: validStatuses } };
                        }
                    }

                    if (whereClause) {
                        validOrderCount = await Order.count({ where: whereClause, transaction: t });
                        lifetimeSpend = await Order.sum('total', { where: whereClause, transaction: t }) || 0;
                    }

                    if (promo.minUserOrderCount > 0 && validOrderCount < promo.minUserOrderCount) {
                        isPromoValid = false;
                        promoError = `Promo code requires a minimum of ${promo.minUserOrderCount} previous valid orders.`;
                    }
                    if (promo.minUserLifetimeSpend > 0 && lifetimeSpend < promo.minUserLifetimeSpend) {
                        isPromoValid = false;
                        promoError = `Promo code requires a lifetime spend of KES ${promo.minUserLifetimeSpend}.`;
                    }
                }

                if (isPromoValid) {
                    appliedPromoDiscountPercentage = promo.discountPercentage;
                    appliedPromoCode = promo.code;
                    appliedPromoObj = promo;
                    console.log(`[DirectOrder] Promo code ${appliedPromoCode} ready to be applied: ${appliedPromoDiscountPercentage}%`);
                } else {
                    await t.rollback();
                    return res.status(400).json({ success: false, message: promoError });
                }
            } else {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Invalid or inactive promo code.' });
            }
        }

        // For Direct Orders placed by Admins or Marketers, we bypass the OTP verification
        // as they are using the "Confirm Phone Number" field to ensure accuracy.
        const isSeller = role === 'seller' || roles.includes('seller');

        if (!isAdmin && !isMarketer && !isSeller) {
            await t.rollback();
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized. Only Admins, Marketers, and Sellers can place direct orders.' 
            });
        }
        
        // 2. Resolve Delivery Fee (Direct orders do not charge/show a delivery fee)
        let deliveryFee = 0;

        // Calculate Discount from Promo Code if applicable
        let orderDiscountableSubtotal = 0;
        for (const pi of processedItems) {
            if (appliedPromoObj && appliedPromoObj.applicableProductIds) {
                let promoProductIds = appliedPromoObj.applicableProductIds;
                if (typeof promoProductIds === 'string') {
                    try { promoProductIds = JSON.parse(promoProductIds); } catch(e) { promoProductIds = []; }
                }
                if (Array.isArray(promoProductIds) && promoProductIds.length > 0) {
                    const typePrefixId = `${pi.type}_${pi.itemId}`;
                    if (promoProductIds.some(promoId => promoId === String(pi.itemId) || promoId === typePrefixId || promoId.startsWith(typePrefixId + ':') || promoId.startsWith(String(pi.itemId) + ':'))) {
                        orderDiscountableSubtotal += pi.subtotal;
                    }
                } else {
                    orderDiscountableSubtotal += pi.subtotal;
                }
            } else {
                orderDiscountableSubtotal += pi.subtotal;
            }
        }

        let computedDiscountAmount = 0;
        if (appliedPromoObj) {
            const preDiscountTotal = totalSubtotal + deliveryFee;
            if (appliedPromoObj.minOrderValue && preDiscountTotal < appliedPromoObj.minOrderValue) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Promo code requires a minimum order value of KES ${appliedPromoObj.minOrderValue}.` });
            }

            if (appliedPromoObj.applicableProductIds && Array.isArray(appliedPromoObj.applicableProductIds) && appliedPromoObj.applicableProductIds.length > 0 && orderDiscountableSubtotal === 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Promo code is not applicable to any items in this order.' });
            }

            computedDiscountAmount = (orderDiscountableSubtotal * appliedPromoDiscountPercentage) / 100;
            if (appliedPromoObj.maxDiscountAmount && computedDiscountAmount > appliedPromoObj.maxDiscountAmount) {
                computedDiscountAmount = appliedPromoObj.maxDiscountAmount;
            }

            appliedPromoObj.usageCount += 1;
            await appliedPromoObj.save({ transaction: t });
        }

        const total = (totalSubtotal + deliveryFee) - computedDiscountAmount;

        // 3. Create Order
        const orderNumber = `DIR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // For FastFood direct orders the admin who places the order implicitly provides
        // the super-admin confirmation step — the seller still confirms manually.
        // Status: super_admin_confirmed → seller clicks confirm → awaiting_delivery_assignment.
        // For product direct orders the standard flow applies (order_placed → admin routes → seller confirms).
        const order = await Order.create({
            userId: user ? user.id : null,
            customerName: customerName || (user ? user.name : effectiveCustomerPhone),
            customerPhone: effectiveCustomerPhone,
            customerEmail: customerEmail || (user ? user.email : null),
            orderNumber: orderNumber,
            total: total,
            deliveryFee: deliveryFee,
            discountAmount: computedDiscountAmount,
            promoCode: appliedPromoCode || null,
            deliveryAddress: deliveryAddress,
            paymentMethod: 'Cash on Delivery',
            paymentType: 'cash_on_delivery',
            status: orderStatus,
            superAdminConfirmed: true,
            superAdminConfirmedAt: now,
            superAdminConfirmedBy: req.user.id,
            adminRoutingStrategy: 'direct_delivery',
            deliveryType: 'seller_to_customer',
            sellerId: firstSellerId,
            marketerId: req.user.id,
            isMarketingOrder: !isAdmin && isMarketer,
            primaryReferralCode: (!isAdmin && isMarketer) ? req.user.referralCode : null,
            secondaryReferralCode: user?.referredByReferralCode || null,
            pickupStationId: pickupStationId || null,
            batchId: batchId || null,
            deliveryTimePreference: deliveryTimePreference || null,
            originalTextBlock: originalTextBlock || null,
            items: processedItems.length
        }, { transaction: t });

        // 4. Create OrderItems
        let totalCommission = 0;
        for (const pi of processedItems) {
            console.log(`[DirectOrder] Creating OrderItem for ${pi.name} (Seller: ${pi.sellerId})`);
            await OrderItem.create({
                orderId: order.id,
                productId: pi.type === 'product' ? pi.itemId : null,
                fastFoodId: pi.type === 'fastfood' ? pi.itemId : null,
                variantId: pi.variantId,
                comboId: pi.comboId,
                name: pi.name,
                quantity: pi.quantity,
                price: pi.unitPrice,
                total: pi.subtotal,
                commissionAmount: pi.commissionAmount,
                sellerId: pi.sellerId,
                itemType: pi.type
            }, { transaction: t });

            totalCommission += pi.commissionAmount;
        }

        // 5. Credit Seller Pending Wallets (Merchandise Payout)
        for (const [sId, earnings] of Object.entries(sellerEarningsMap)) {
            if (earnings > 0) {
                await creditPending(
                    sId,
                    earnings,
                    `Direct Sale Earning for Order #${order.orderNumber} (Pending)`,
                    order.id,
                    t,
                    'seller'
                );
            }
        }

        // 6. Standard Commission Logic (Marketer Credits)
        try {
            await calculateCommission(order.id, order.primaryReferralCode, order.secondaryReferralCode, { transaction: t });
        } catch (commErr) {
            console.warn(`[DirectOrder] Failed to calculate commission for order ${order.id}:`, commErr);
        }

        // Update order with final commission
        order.totalCommission = totalCommission;
        await order.save({ transaction: t });

        await t.commit();

        // Trigger Auto-Confirmation in background if seller has it enabled
        setImmediate(() => {
            const { triggerAutoConfirmation } = require('./orderController');
            triggerAutoConfirmation(order.id).catch(err => console.error('[DirectOrder] Background AutoConfirm Error:', err));
        });

        // Trigger Auto-Task Creation immediately for the confirmed status
        try {
            await autoCreateDeliveryTask(order, null, 'super_admin_confirmed');
            console.log(`[placeDirectOrder] Auto-created delivery task for direct order ${order.orderNumber}`);
        } catch (taskErr) {
            console.error(`[placeDirectOrder] Failed to auto-create delivery task for order ${order.orderNumber}:`, taskErr);
        }
        console.log(`[DirectOrder] Order ${orderNumber} placed successfully with ${processedItems.length} items.`);

        // Respond to user immediately to make it "instant"
        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order.id,
            orderNumber: order.orderNumber
        });

        // 5. Send Notifications (In background)
        setImmediate(async () => {
            try {
                const customerObj = user ? { id: user.id, name: user.name, phone: user.phone, email: user.email } : { phone: customerPhone, name: customerName };
                const fullItemsList = processedItems.map(pi => `* ${pi.name} x${pi.quantity} - KES ${(pi.subtotal).toLocaleString()}`).join('\n');
                
                console.log(`[DirectOrder] Notifying customer for ${order.orderNumber}`);
                await notifyCustomerOrderPlaced(order, customerObj, processedItems.length, fullItemsList, req.user.referralCode || null);

                // Group items by seller for individual seller notifications
                const itemsBySeller = processedItems.reduce((acc, item) => {
                    if (!acc[item.sellerId]) acc[item.sellerId] = { items: [], total: 0, baseTotal: 0 };
                    acc[item.sellerId].items.push(`• ${item.name} x${item.quantity}`);
                    acc[item.sellerId].total += item.subtotal;
                    acc[item.sellerId].baseTotal += item.sellerBasePrice; // Using base price for seller
                    return acc;
                }, {});

                for (const [sellerId, data] of Object.entries(itemsBySeller)) {
                    const seller = await User.findByPk(sellerId);
                    if (seller) {
                        console.log(`[DirectOrder] Notifying seller ${sellerId} for ${order.orderNumber} with base price ${data.baseTotal}`);
                        const sellerItemsList = data.items.join('\n');
                        // Passing baseTotal as requested: "should show base price"
                        await notifySellerOrderPlaced(order, seller, data.baseTotal.toLocaleString(), sellerItemsList);
                    }
                }

                if (isMarketer && !isAdmin) {
                    console.log(`[DirectOrder] Notifying marketer ${req.user.id} for ${order.orderNumber}`);
                    await notifyMarketerOrderPlaced(order, req.user, customerName, totalCommission);
                }
            } catch (err) {
                console.warn('[DirectOrder] Background notification dispatch failed:', err.message);
            }
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error('[directOrderController] placement error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to place order' });
    }
};
