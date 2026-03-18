module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            const tableInfo = await queryInterface.describeTable('Order');

            if (!tableInfo.checkoutGroupId) {
                await queryInterface.addColumn('Order', 'checkoutGroupId', {
                    type: Sequelize.STRING,
                    allowNull: true
                });
                console.log('✅ Added checkoutGroupId to Order table');
            }

            if (!tableInfo.checkoutOrderNumber) {
                await queryInterface.addColumn('Order', 'checkoutOrderNumber', {
                    type: Sequelize.STRING,
                    allowNull: true
                });
                console.log('✅ Added checkoutOrderNumber to Order table');
            }
        } catch (err) {
            console.error('❌ Migration Error:', err.message);
            // If table doesn't exist, try plural 'Orders' just in case
            try {
                const tableInfoPlural = await queryInterface.describeTable('Orders');
                if (!tableInfoPlural.checkoutGroupId) {
                    await queryInterface.addColumn('Orders', 'checkoutGroupId', {
                        type: Sequelize.STRING,
                        allowNull: true
                    });
                    console.log('✅ Added checkoutGroupId to Orders table');
                }
                if (!tableInfoPlural.checkoutOrderNumber) {
                    await queryInterface.addColumn('Orders', 'checkoutOrderNumber', {
                        type: Sequelize.STRING,
                        allowNull: true
                    });
                    console.log('✅ Added checkoutOrderNumber to Orders table');
                }
            } catch (err2) {
                console.error('❌ Migration Error (Plural):', err2.message);
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Standard practice: don't automatically drop columns in down unless absolutely sure
    }
};
