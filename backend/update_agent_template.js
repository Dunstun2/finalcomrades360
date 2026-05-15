const { PlatformConfig } = require('./models');

async function updateTemplate() {
    try {
        const config = await PlatformConfig.findOne({ where: { key: 'whatsapp_config' } });
        if (config) {
            const data = JSON.parse(config.value);
            
            if (!data.templates) {
                data.templates = {};
            }

            data.templates.agentTaskAssigned = `You have been assigned a new delivery task for order #{orderNumber}. 🚚\n\nType: {deliveryType}\nItems: {itemsList}\nTotal to Pay: KES {totalAmount}\nPickup Point: {pickupLocation}\nDrop-off: {deliveryLocation}\nCustomer Phone: {customerPhone}\n\n⚠️ PLEASE ACCEPT TO AVOID AUTOMATIC REASSIGNMENT.\n\nManage Task:\n{dashboardUrl}`;

            await config.update({ value: JSON.stringify(data) });
            console.log('Template updated successfully inside whatsapp_config');
        } else {
            console.log('whatsapp_config not found');
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

updateTemplate();
