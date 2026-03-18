const { Order, User, Warehouse, PickupStation, OrderItem } = require('./models');
const { sequelize } = require('./database/database');
const bcrypt = require('bcryptjs');

async function testBulkAssign() {
    try {
        // Find an admin
        const admin = await User.findOne({ where: { role: 'super_admin' } });
        const agent = await User.findOne({ where: { role: 'delivery_agent' } });
        const orders = await Order.findAll({ limit: 2 });

        if (!admin || !agent || orders.length < 1) {
            console.log('Not enough data to test');
            return;
        }

        console.log(`Testing with Admin ID: ${admin.id}, Agent ID: ${agent.id}`);
        console.log(`Order IDs: ${orders.map(o => o.id).join(', ')}`);

        // We need the admin password.
        const hashedPrice = await bcrypt.hash('testpass', 10);
        await admin.update({ password: hashedPrice });

        // Simulate the request object
        const req = {
            user: { id: admin.id },
            body: {
                orderIds: orders.map(o => o.id),
                password: 'testpass',
                deliveryAgentId: agent.id,
                deliveryType: 'warehouse_to_customer'
            }
        };

        const res = {
            status: function (s) { this.statusCode = s; return this; },
            json: function (data) { console.log('Response:', this.statusCode || 200, JSON.stringify(data, null, 2)); }
        };

        // Call the function
        const { bulkAssignDeliveryAgent } = require('./controllers/orderController');
        await bulkAssignDeliveryAgent(req, res);

    } catch (err) {
        console.error('CRASH:', err);
    } finally {
        await sequelize.close();
    }
}

testBulkAssign();
