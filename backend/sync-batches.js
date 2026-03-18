const { Batch } = require('./models');

async function syncBatches() {
    try {
        console.log('🔄 Syncing Batches table with new fields...');
        await Batch.sync({ alter: true });
        console.log('✅ Batches table synced successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to sync Batches table:', error);
        process.exit(1);
    }
}

syncBatches();
