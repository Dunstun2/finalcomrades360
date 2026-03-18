const { Order, DeliveryTask } = require('../models');
const { sequelize } = require('../database/database');

async function migrateStatus() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🚀 Starting Order status migration: out_for_delivery -> in_transit');

        // Update Orders
        const [orderCount] = await Order.update(
            { status: 'in_transit' },
            { where: { status: 'out_for_delivery' }, transaction }
        );
        console.log(`✅ Updated ${orderCount} Orders.`);

        // Note: DeliveryTask status 'in_progress' is usually what corresponds to 'out_for_delivery'.
        // We don't necessarily need to rename DeliveryTask.status unless it was literally 'out_for_delivery'.
        // Looking at the code, DeliveryTask use 'assigned', 'accepted', 'in_progress', 'completed', 'failed'.
        // So usually no rename needed for tasks themselves, but let's check for robustness.

        await transaction.commit();
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateStatus();
