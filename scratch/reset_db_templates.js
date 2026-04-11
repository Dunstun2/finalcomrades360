const { PlatformConfig } = require('../backend/models');

const newTemplates = {
    orderPlaced: `Hello {name}, your order #{orderNumber} has been placed successfully! 🛍️\n\nItems:\n{itemsList}\n\nTotal: KES {total}\nPayment: {paymentMethod}\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryLocation}\n\nThank you for shopping with Comrades360!`,
    sellerConfirmed: `Hello {name}, good news! 🥗\n\nYour order #{orderNumber} has been confirmed by {sellerName} and is now being prepared.\n\nWe will notify you as soon as it is handed over to our delivery agent.\n\nThank you for choosing Comrades360!`,
    orderInTransit: `Your order #{orderNumber} is on its way! 🚚\n\nHello {name}, your package has been collected by {agentName} ({agentPhone}) and is in transit.\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryAddress}\n\nPlease stay reachable for a smooth delivery!`,
    orderReadyPickup: `Your order #{orderNumber} is ready for collection! 📦\n\nHello {name}, your items have arrived at the pickup location and are ready for you.\n\nPickup Details:\nStation: {stationName}\nLocation: {stationLocation}\nContact: {stationPhone}\n\nSee you soon at Comrades360!`,
    orderCancelled: `Order Notification: Cancellation ❌\n\nHello {name}, we regret to inform you that order #{orderNumber} has been cancelled.\n\nCancellation Details:\nReason: {reason}\n\nWe apologize for the inconvenience and hope to serve you again soon.`
};

async function resetTemplates() {
    try {
        const configRecord = await PlatformConfig.findOne({ where: { key: 'whatsapp_config' } });
        if (configRecord) {
            const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
            
            dbConfig.templates = {
                ...dbConfig.templates,
                ...newTemplates
            };

            await configRecord.update({ value: JSON.stringify(dbConfig) });
            console.log('✅ Database notification templates updated successfully!');
        } else {
            console.log('❌ No whatsapp_config found in database.');
        }
    } catch (err) {
        console.error('Error resetting templates:', err);
    } finally {
        process.exit();
    }
}

resetTemplates();
