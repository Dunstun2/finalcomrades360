const { Order, OrderItem, sequelize } = require('../models');

async function purgeOrphanItems() {
    console.log('--- Purging Orphan OrderItems ---');
    const transaction = await sequelize.transaction();
    
    try {
        // Find all OrderItems
        const items = await OrderItem.findAll({ attributes: ['id', 'orderId'], transaction });
        const orders = await Order.findAll({ attributes: ['id'], transaction });
        const orderIds = new Set(orders.map(o => o.id));
        
        const orphans = items.filter(item => !orderIds.has(item.orderId));
        const orphanIds = orphans.map(o => o.id);
        
        console.log(`Total items checked: ${items.length}`);
        console.log(`Orphans identified: ${orphanIds.length}`);
        
        if (orphanIds.length > 0) {
            const deletedCount = await OrderItem.destroy({
                where: { id: orphanIds },
                transaction
            });
            console.log(`Successfully deleted ${deletedCount} orphan items.`);
        } else {
            console.log('No orphan items found.');
        }
        
        await transaction.commit();
        console.log('--- Purge Complete ---');
    } catch (error) {
        await transaction.rollback();
        console.error('Error during purge:', error);
        process.exit(1);
    }
}

purgeOrphanItems().then(() => process.exit(0));
