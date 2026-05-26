'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('promo_codes');

    if (!tableInfo.validFrom) {
      await queryInterface.addColumn('promo_codes', 'validFrom', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    
    if (!tableInfo.validUntil) {
      await queryInterface.addColumn('promo_codes', 'validUntil', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    
    if (!tableInfo.targetAudience) {
      await queryInterface.addColumn('promo_codes', 'targetAudience', {
        type: Sequelize.ENUM('all', 'new_users'),
        defaultValue: 'all',
      });
    }
    
    if (!tableInfo.applicableProductIds) {
      await queryInterface.addColumn('promo_codes', 'applicableProductIds', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    if (!tableInfo.minOrderValue) {
      await queryInterface.addColumn('promo_codes', 'minOrderValue', {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      });
    }
    
    if (!tableInfo.maxDiscountAmount) {
      await queryInterface.addColumn('promo_codes', 'maxDiscountAmount', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }
    
    if (!tableInfo.maxUsageLimit) {
      await queryInterface.addColumn('promo_codes', 'maxUsageLimit', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.usageCount) {
      await queryInterface.addColumn('promo_codes', 'usageCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('promo_codes');

    if (tableInfo.validFrom) await queryInterface.removeColumn('promo_codes', 'validFrom');
    if (tableInfo.validUntil) await queryInterface.removeColumn('promo_codes', 'validUntil');
    if (tableInfo.targetAudience) await queryInterface.removeColumn('promo_codes', 'targetAudience');
    if (tableInfo.applicableProductIds) await queryInterface.removeColumn('promo_codes', 'applicableProductIds');
    if (tableInfo.minOrderValue) await queryInterface.removeColumn('promo_codes', 'minOrderValue');
    if (tableInfo.maxDiscountAmount) await queryInterface.removeColumn('promo_codes', 'maxDiscountAmount');
    if (tableInfo.maxUsageLimit) await queryInterface.removeColumn('promo_codes', 'maxUsageLimit');
    if (tableInfo.usageCount) await queryInterface.removeColumn('promo_codes', 'usageCount');
  }
};
