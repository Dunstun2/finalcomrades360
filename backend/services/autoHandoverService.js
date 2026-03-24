const { HandoverCode, sequelize, Op } = require('../models');
const { confirmHandoverProcessor } = require('./handoverService');

/**
 * Background worker that automatically confirms handover codes 
 * that have reached their autoConfirmAt time.
 */
const runAutoHandoverWorker = async () => {
    console.log('[autoHandoverService] Starting auto-handover worker...');

    // Poll every 60 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            
            // Find all pending codes where autoConfirmAt is in the past
            const pendingAutoCodes = await HandoverCode.findAll({
                where: {
                    status: 'pending',
                    autoConfirmAt: {
                        [Op.lte]: now,
                        [Op.ne]: null
                    }
                }
            });

            if (pendingAutoCodes.length > 0) {
                console.log(`[autoHandoverService] Found ${pendingAutoCodes.length} codes to auto-confirm.`);
                
                for (const handover of pendingAutoCodes) {
                    console.log(`[autoHandoverService] Auto-confirming handover ${handover.id} (Order #${handover.orderId})`);
                    
                    try {
                        await confirmHandoverProcessor(
                            handover.id, 
                            'SYSTEM_AUTO', 
                            'Automatic confirmation due to timeout (customer smartphone absence fallback)'
                        );
                    } catch (error) {
                        console.error(`[autoHandoverService] Failed to auto-confirm handover ${handover.id}:`, error);
                    }
                }
            }

        } catch (error) {
            console.error('[autoHandoverService] Error in background worker:', error);
        }
    }, 60000); // 1 minute interval
};

module.exports = {
    runAutoHandoverWorker
};
