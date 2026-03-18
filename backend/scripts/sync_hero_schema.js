const { HeroPromotion } = require('../models/index');
const { sequelize } = require('../database/database');

const syncModel = async () => {
    try {
        console.log('🔄 Checking HeroPromotion schema...');

        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connected.');

        // Sync only the HeroPromotion model with alter: true
        await HeroPromotion.sync({ alter: true });

        console.log('✅ HeroPromotion table synchronized (columns added if missing).');
        process.exit(0);
    } catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
};

syncModel();
