const { FastFood, sequelize } = require('../models');
const { Op } = require('sequelize');

async function syncDeliveryFees() {
    console.log('🚀 Starting FastFood Delivery Fee Synchronization...');
    
    try {
        // 1. Find all approved fast food items that have a delivery fee set
        const itemsWithFees = await FastFood.findAll({
            where: {
                deliveryFee: { [Op.not]: null },
                [Op.or]: [
                    { approved: true },
                    { reviewStatus: 'approved' }
                ]
            },
            attributes: ['vendor', 'deliveryFee', 'updatedAt'],
            order: [['updatedAt', 'DESC']]
        });

        if (itemsWithFees.length === 0) {
            console.log('ℹ️ No approved items found with delivery fees set.');
            return;
        }

        // 2. Map sellers to their most recently set delivery fee
        const sellerFeeMap = new Map();
        itemsWithFees.forEach(item => {
            if (!sellerFeeMap.has(item.vendor)) {
                sellerFeeMap.set(item.vendor, item.deliveryFee);
            }
        });

        console.log(`📊 Found delivery fees for ${sellerFeeMap.size} sellers.`);

        // 3. Update all other approved items for these sellers
        let totalUpdated = 0;
        for (const [vendorId, fee] of sellerFeeMap.entries()) {
            console.log(`⚙️ Syncing fee ${fee} KES for vendor ID: ${vendorId}...`);
            
            const [affectedCount] = await FastFood.update(
                { deliveryFee: fee },
                {
                    where: {
                        vendor: vendorId,
                        [Op.or]: [
                            { approved: true },
                            { reviewStatus: 'approved' }
                        ],
                        // Only update if it's different or null
                        [Op.or]: [
                            { deliveryFee: { [Op.is]: null } },
                            { deliveryFee: { [Op.ne]: fee } }
                        ]
                    }
                }
            );

            totalUpdated += affectedCount;
            if (affectedCount > 0) {
                console.log(`   ✅ Updated ${affectedCount} items.`);
            } else {
                console.log(`   ⏭️ All items already in sync.`);
            }
        }

        console.log(`\n🎉 Synchronization complete! Total items updated: ${totalUpdated}`);
    } catch (error) {
        console.error('❌ Error during synchronization:', error);
    } finally {
        await sequelize.close();
    }
}

syncDeliveryFees();
