const { Product, FastFood, User, Order, OrderItem, Commission, PickupStation, DeliveryCharge, PlatformConfig } = require('../models');
const { Op } = require('sequelize');
const { calculateItemCommission } = require('../utils/commissionUtils');
const { notifyCustomerOrderPlaced, notifyMarketerOrderPlaced, notifySellerOrderPlaced } = require('../utils/notificationHelpers');
const { sequelize } = require('../database/database');
const { normalizeKenyanPhone } = require('../middleware/validators');

/**
 * Determines if a string is likely an address based on patterns
 */
function isLikelyAddress(str) {
  const trimmed = str.toLowerCase().trim();
  if (trimmed.length < 2 || trimmed.length > 20) return false;
  
  // Pure numbers (like house numbers)
  if (/^\d+$/.test(trimmed)) return true;
  
  // Letter + number like K8, A1, etc.
  if (/^[a-z]\d+$/.test(trimmed)) return true;
  
  // Number + letter
  if (/^\d+[a-z]+$/.test(trimmed)) return true;
  
  // Mixed alphanumeric (contains both letters and numbers)
  if (/^[a-z\d]+$/.test(trimmed) && /[a-z]/.test(trimmed) && /\d/.test(trimmed)) return true;
  
  // Address keywords
  const keywords = ['nyayo', 'nyao', 'km', 'hostel', 'room', 'house', 'apt', 'unit', 'block', 'estate', 'gate', 'stage', 'shop', 'market', 'plaza', 'building', 'floor', 'hall', 'kili', 'junction', 'road', 'rd', 'street', 'st', 'ave', 'avenue', 'lane', 'ln'];
  if (keywords.some(k => trimmed.includes(k))) return true;
  
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
const parseTextBlock = (text) => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 1) return null;

    const phoneRegex = /(\+?254|0)?(7|1)\d{8}/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
                            type: isFF ? 'fastfood' : 'product'
                        });
                    }

                    // Variants (FF only) - also require full candidate match
                    if (isFF && searchLower.length >= 2) {
                        let variants = [];
                        try { variants = typeof m.sizeVariants === 'string' ? JSON.parse(m.sizeVariants) : (m.sizeVariants || []); } catch(e){}
                        for (const v of variants) {
                            const vName = v.name || v.size || '';
                            if (vName.toLowerCase().includes(searchLower)) {
                                itemMatches.push({ id: `${m.id}_variant_${v.id || vName}`, name: `${m.name} (${vName})`, price: v.discountPrice || v.displayPrice || m.displayPrice, sellerId: m.vendor, type: 'fastfood' });
                            }
                        }
                        
                        let combos = [];
                        try { combos = typeof m.comboOptions === 'string' ? JSON.parse(m.comboOptions) : (m.comboOptions || []); } catch(e){}
                        for (const c of combos) {
                            const cName = c.name || c.title || '';
                            if (cName.toLowerCase().includes(searchLower)) {
                                itemMatches.push({ id: `${m.id}_combo_${c.id || cName}`, name: `${m.name} (${cName})`, price: c.discountPrice || c.displayPrice || m.displayPrice, sellerId: m.vendor, type: 'fastfood' });
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
        const remaining = parsed.candidates.filter(c => !usedLines.has(c.original)).map(c => c.original);
        let customerName = '';
        let addressLines = [];

        if (remaining.length > 0) {
            // Since customer name is often missing from direct order blocks,
            // treat all remaining lines as parts of the delivery address
            addressLines = remaining;
        }

        const finalParsed = {
            items: detectedItems,
            customerPhone: parsed.customerPhone,
            customerName: customerName,
            customerEmail: parsed.customerEmail,
            deliveryAddress: addressLines.join(', ') || 'N/A'
        };

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
            originalTextBlock
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
                commissionAmount,
                sellerId
            });
        }

        const sellerId = firstSellerId;
        const orderStatus = isFastFoodOrder ? 'super_admin_confirmed' : 'order_placed';
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
        
        // 2. Resolve Delivery Fee
        let deliveryFee = 0;
        if (pickupStationId) {
            const station = await PickupStation.findByPk(pickupStationId);
            deliveryFee = station ? parseFloat(station.price || 0) : 0;
        } else {
            // Fallback to platform default delivery fee
            const config = await PlatformConfig.findOne({ where: { key: 'default_delivery_fee' } });
            deliveryFee = config ? parseFloat(config.value) : 0;
        }

        const total = totalSubtotal + deliveryFee;

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
            deliveryAddress: deliveryAddress,
            paymentMethod: 'Cash on Delivery',
            paymentType: 'cash_on_delivery',
            status: orderStatus,
            superAdminConfirmed: isFastFoodOrder ? true : false,
            superAdminConfirmedAt: isFastFoodOrder ? now : null,
            superAdminConfirmedBy: isFastFoodOrder ? req.user.id : null,
            adminRoutingStrategy: isFastFoodOrder ? 'direct_delivery' : null,
            deliveryType: isFastFoodOrder ? 'seller_to_customer' : null,
            sellerId: firstSellerId,
            marketerId: req.user.id,
            isMarketingOrder: !isAdmin && isMarketer,
            pickupStationId: pickupStationId || null,
            originalTextBlock: originalTextBlock || null,
            items: processedItems.length
        }, { transaction: t });

        // 4. Create OrderItems & Handle Commissions
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
                sellerId: pi.sellerId
            }, { transaction: t });

            totalCommission += pi.commissionAmount;

            if (isMarketer && pi.commissionAmount > 0) {
                await Commission.create({
                    marketerId: req.user.id,
                    orderId: order.id,
                    productId: pi.type === 'product' ? pi.itemId : null,
                    fastFoodId: pi.type === 'fastfood' ? pi.itemId : null,
                    saleAmount: pi.subtotal,
                    commissionRate: parseFloat(pi.dbItem.marketingCommission || 0),
                    commissionAmount: pi.commissionAmount,
                    status: 'pending',
                    referralCode: req.user.referralCode || 'DIRECT',
                    sellerId: pi.sellerId
                }, { transaction: t });
            }
        }

        // Update order with final commission
        order.totalCommission = totalCommission;
        await order.save({ transaction: t });

        await t.commit();
        console.log(`[DirectOrder] Order ${orderNumber} placed successfully with ${processedItems.length} items.`);

        // 5. Send Notifications (Async)
        try {
            const customerObj = user ? { id: user.id, name: user.name, phone: user.phone, email: user.email } : { phone: customerPhone, name: customerName };
            const fullItemsList = processedItems.map(pi => `• ${pi.name} x${pi.quantity}`).join('\n');
            
            console.log(`[DirectOrder] Notifying customer for ${order.orderNumber}`);
            await notifyCustomerOrderPlaced(order, customerObj, processedItems.length, fullItemsList, req.user.referralCode || null);

            // Group items by seller for individual seller notifications
            const itemsBySeller = processedItems.reduce((acc, item) => {
                if (!acc[item.sellerId]) acc[item.sellerId] = { items: [], total: 0 };
                acc[item.sellerId].items.push(`• ${item.name} x${item.quantity}`);
                acc[item.sellerId].total += item.subtotal;
                return acc;
            }, {});

            for (const [sellerId, data] of Object.entries(itemsBySeller)) {
                const seller = await User.findByPk(sellerId);
                if (seller) {
                    console.log(`[DirectOrder] Notifying seller ${sellerId} for ${order.orderNumber}`);
                    const sellerItemsList = data.items.join('\n');
                    await notifySellerOrderPlaced(order, seller, data.total.toLocaleString(), sellerItemsList);
                }
            }

            if (isMarketer && !isAdmin) {
                console.log(`[DirectOrder] Notifying marketer ${req.user.id} for ${order.orderNumber}`);
                await notifyMarketerOrderPlaced(order, req.user, customerName, totalCommission);
            }
        } catch (err) {
            console.warn('[DirectOrder] Notification dispatch failed:', err.message);
        }

        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order.id,
            orderNumber: order.orderNumber
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error('[directOrderController] placement error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to place order' });
    }
};
