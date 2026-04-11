require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Op } = require('sequelize');

const {
    Order,
    User,
    Warehouse,
    PickupStation,
    DeliveryTask,
    DeliveryAgentProfile
} = require('../models');

const API_URL = process.env.SIM_API_URL || 'http://localhost:5001/api';
const ADMIN_EMAIL = process.env.SIM_ADMIN_EMAIL || 'dunstunw@gmail.com';
const CUSTOMER_EMAIL = process.env.SIM_CUSTOMER_EMAIL || 'lourenwambutsi93@gmail.com';
const ADMIN_PASSWORD = process.env.SIM_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'comrades360admin';

let resolvedAdminPassword = process.env.SIM_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || null;

function getAdminPasswordCandidates() {
    const candidates = [
        resolvedAdminPassword,
        process.env.SIM_ADMIN_PASSWORD,
        process.env.ADMIN_PASSWORD,
        'comrades360admin',
        'admin'
    ].filter(Boolean);

    return [...new Set(candidates)];
}

function makeHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

async function generateToken(userId) {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1d' }
    );
}

async function apiCall(method, url, headers, body) {
    const config = { method, url, headers };
    if (body !== undefined) config.data = body;
    return axios(config);
}

async function findWorkableAgent() {
    const agents = await User.findAll({ where: { role: 'delivery_agent' }, order: [['id', 'ASC']] });

    for (const agent of agents) {
        const profile = await DeliveryAgentProfile.findOne({ where: { userId: agent.id } });
        if (!profile || !profile.isActive) continue;

        const hasLocation = !!profile.location;
        const hasVehicleType = !!profile.vehicleType;
        const needsPlate = profile.vehicleType !== 'Walking' && profile.vehicleType !== 'Bicycle';
        const hasPlate = !needsPlate || !!profile.vehiclePlate;
        const hasEmergency = !!profile.emergencyContact;
        const hasPhone = !!agent.phone;

        if (hasLocation && hasVehicleType && hasPlate && hasEmergency && hasPhone) {
            return agent;
        }
    }

    return null;
}

async function findInProgressCustomerOrder(customerId) {
    const inProgressStatuses = [
        'order_placed',
        'seller_confirmed',
        'super_admin_confirmed',
        'en_route_to_warehouse',
        'at_warehouse',
        'en_route_to_pick_station',
        'at_pick_station',
        'awaiting_delivery_assignment',
        'processing',
        'ready_for_pickup',
        'in_transit'
    ];

    return Order.findOne({
        where: {
            userId: customerId,
            status: { [Op.in]: inProgressStatuses }
        },
        order: [['createdAt', 'DESC']]
    });
}

function getUserRoles(user) {
    const baseRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';
    const extraRoles = Array.isArray(user?.roles)
        ? user.roles.map((r) => String(r).toLowerCase())
        : [];
    return [baseRole, ...extraRoles].filter(Boolean);
}

function canActAsSeller(user) {
    const roles = getUserRoles(user);
    return roles.includes('seller') || roles.includes('admin') || roles.includes('superadmin') || roles.includes('super_admin');
}

async function findSellerCandidate(adminUser) {
    const users = await User.findAll({ order: [['id', 'ASC']] });
    const candidates = users.filter((u) => canActAsSeller(u));
    if (!candidates.length) return null;

    const adminCandidate = candidates.find((u) => u.id === adminUser.id);
    if (adminCandidate) return adminCandidate;

    const withCompleteSellerProfile = candidates.find((u) => User.isSellerProfileComplete(u));
    return withCompleteSellerProfile || candidates[0];
}

async function createTargetOrder(customer, seller, station) {
    const timestamp = Date.now();
    const created = await Order.create({
        userId: customer.id,
        sellerId: seller.id,
        orderNumber: `SIM-${timestamp}`,
        total: 1499,
        items: 1,
        status: 'order_placed',
        paymentMethod: 'Cash on Delivery',
        paymentType: 'cash_on_delivery',
        deliveryMethod: 'home_delivery',
        customerName: customer.name || 'Simulation Customer',
        customerEmail: customer.email,
        customerPhone: customer.phone || null,
        pickupStationId: station.id,
        deliveryAddress: customer.address || customer.estate || customer.town || 'Test Address',
        addressDetails: customer.address || customer.estate || customer.town || 'Test Address',
        deliveryLat: customer.lat || null,
        deliveryLng: customer.lng || null
    });

    console.log(`🆕 Created new order #${created.orderNumber} for ${customer.email}.`);
    return created;
}

async function fetchLatestTask(orderId, agentId) {
    return DeliveryTask.findOne({
        where: {
            orderId,
            deliveryAgentId: agentId,
            status: { [Op.in]: ['assigned', 'accepted', 'in_progress'] }
        },
        order: [['createdAt', 'DESC']]
    });
}

async function assignLeg({ orderId, adminHeaders, agentId, deliveryType, warehouseId, pickupStationId, deliveryFee }) {
    const passwordCandidates = getAdminPasswordCandidates();
    let lastError = null;

    for (const passwordCandidate of passwordCandidates) {
        try {
            await apiCall('patch', `${API_URL}/orders/${orderId}/assign`, adminHeaders, {
                deliveryAgentId: agentId,
                deliveryType,
                warehouseId,
                pickupStationId,
                deliveryFee,
                password: passwordCandidate
            });

            resolvedAdminPassword = passwordCandidate;
            return;
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || '';
            const isBadPassword = error.response?.status === 401 && String(message).toLowerCase().includes('incorrect admin password');
            if (isBadPassword) {
                lastError = error;
                continue;
            }

            throw error;
        }
    }

    if (lastError) {
        throw new Error('Admin password validation failed for assignment. Set SIM_ADMIN_PASSWORD to the correct admin password and rerun.');
    }

    throw new Error('No usable admin password candidate found. Set SIM_ADMIN_PASSWORD and rerun.');
}

async function completeTaskAsAgent(task, agentHeaders) {
    if (!task) throw new Error('No assignable task found for agent.');

    if (task.status !== 'in_progress') {
        await apiCall('patch', `${API_URL}/delivery/tasks/${task.id}/status`, agentHeaders, { status: 'in_progress' });
    }

    await apiCall('patch', `${API_URL}/delivery/tasks/${task.id}/status`, agentHeaders, { status: 'completed' });
}

async function run() {
    console.log('🚀 Starting targeted order flow simulation...');
    console.log(`API: ${API_URL}`);
    console.log(`Admin: ${ADMIN_EMAIL}`);
    console.log(`Customer: ${CUSTOMER_EMAIL}`);

    try {
        const adminUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
        if (!adminUser) throw new Error(`Admin user not found: ${ADMIN_EMAIL}`);

        const customerUser = await User.findOne({ where: { email: CUSTOMER_EMAIL } });
        if (!customerUser) throw new Error(`Customer user not found: ${CUSTOMER_EMAIL}`);

        const workableAgent = await findWorkableAgent();
        if (!workableAgent) {
            throw new Error('No active + profile-complete delivery agent found.');
        }

        const warehouse = await Warehouse.findOne({ order: [['id', 'ASC']] });
        const station = await PickupStation.findOne({ order: [['id', 'ASC']] });
        if (!warehouse || !station) {
            throw new Error('Need at least one warehouse and pickup station in DB.');
        }

        const adminHeaders = makeHeaders(await generateToken(adminUser.id));
        const agentHeaders = makeHeaders(await generateToken(workableAgent.id));

        const sellerCandidate = await findSellerCandidate(adminUser);
        if (!sellerCandidate) {
            throw new Error(
                'No seller-capable user found (seller/admin/superadmin). Ensure admin or seller account exists and rerun.'
            );
        }

        let targetOrder = await findInProgressCustomerOrder(customerUser.id);
        if (targetOrder) {
            console.log(`♻️ Reusing in-progress order #${targetOrder.orderNumber} (status: ${targetOrder.status}).`);
            if (!targetOrder.sellerId) {
                targetOrder.sellerId = sellerCandidate.id;
                await targetOrder.save({ fields: ['sellerId'] });
                console.log(`🧩 Filled missing sellerId on existing order with user #${sellerCandidate.id} (${sellerCandidate.email}).`);
            }
        } else {
            targetOrder = await createTargetOrder(customerUser, sellerCandidate, station);
        }

        console.log(`🎯 Working on order #${targetOrder.orderNumber} (id: ${targetOrder.id})`);

        const maxSteps = 14;

        for (let step = 1; step <= maxSteps; step += 1) {
            const order = await Order.findByPk(targetOrder.id);
            if (!order) throw new Error('Order disappeared while processing.');

            console.log(`\n[Step ${step}] Current status: ${order.status}`);

            if (['delivered', 'completed'].includes(order.status)) {
                console.log(`✅ Order #${order.orderNumber} finished successfully with status: ${order.status}`);
                return;
            }

            if (['cancelled', 'failed', 'returned', 'return_in_progress'].includes(order.status)) {
                throw new Error(`Order entered terminal non-success status: ${order.status}`);
            }

            if (['order_placed', 'seller_confirmed'].includes(order.status)) {
                console.log('📝 Super-admin confirming order with warehouse routing...');
                await apiCall('post', `${API_URL}/orders/${order.id}/super-admin-confirm`, adminHeaders, {
                    adminRoutingStrategy: 'warehouse',
                    destinationWarehouseId: warehouse.id,
                    adminRoutingNotes: 'Simulation route: warehouse -> pickup station -> customer'
                });
                continue;
            }

            if (order.status === 'super_admin_confirmed') {
                console.log('🚚 Admin assigning seller -> warehouse leg...');
                await assignLeg({
                    orderId: order.id,
                    adminHeaders,
                    agentId: workableAgent.id,
                    deliveryType: 'seller_to_warehouse',
                    warehouseId: warehouse.id,
                    deliveryFee: 100
                });

                const task = await fetchLatestTask(order.id, workableAgent.id);
                await completeTaskAsAgent(task, agentHeaders);
                console.log('✅ Seller -> warehouse completed.');
                continue;
            }

            if (order.status === 'at_warehouse') {
                console.log('🏢 Admin assigning warehouse -> pickup station leg...');
                await assignLeg({
                    orderId: order.id,
                    adminHeaders,
                    agentId: workableAgent.id,
                    deliveryType: 'warehouse_to_pickup_station',
                    pickupStationId: station.id,
                    deliveryFee: 150
                });

                const task = await fetchLatestTask(order.id, workableAgent.id);
                await completeTaskAsAgent(task, agentHeaders);
                console.log('✅ Warehouse -> pickup station completed.');
                continue;
            }

            if (['at_pick_station', 'ready_for_pickup', 'awaiting_delivery_assignment'].includes(order.status)) {
                console.log('🏠 Admin assigning pickup station -> customer final leg...');
                await assignLeg({
                    orderId: order.id,
                    adminHeaders,
                    agentId: workableAgent.id,
                    deliveryType: 'pickup_station_to_customer',
                    pickupStationId: station.id,
                    deliveryFee: 200
                });

                const task = await fetchLatestTask(order.id, workableAgent.id);
                await completeTaskAsAgent(task, agentHeaders);
                console.log('✅ Pickup station -> customer completed.');
                continue;
            }

            if (['en_route_to_warehouse', 'en_route_to_pick_station', 'in_transit', 'processing'].includes(order.status)) {
                console.log('⏳ Order already in transit; attempting to complete active task...');
                const task = await fetchLatestTask(order.id, workableAgent.id);
                if (task) {
                    await completeTaskAsAgent(task, agentHeaders);
                    console.log('✅ Active task completed.');
                    continue;
                }

                throw new Error(`Order is ${order.status} but no active task is assigned to the selected agent.`);
            }

            throw new Error(`Unhandled order status encountered: ${order.status}`);
        }

        const finalOrder = await Order.findByPk(targetOrder.id);
        throw new Error(
            `Max steps reached without success. Final status: ${finalOrder ? finalOrder.status : 'unknown'}`
        );
    } catch (error) {
        const details = error.response?.data || error.message;
        console.error('❌ Simulation failed:', details);
        process.exitCode = 1;
    }
}

run();
