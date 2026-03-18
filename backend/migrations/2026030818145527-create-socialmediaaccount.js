'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('SocialMediaAccount')) return;

    await queryInterface.createTable('SocialMediaAccount', {
id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userReferralCode: {
          type: Sequelize.STRING,
          allowNull: false,
          references: {
            model: 'User',
            key: 'referralCode'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        platform: {
          type: Sequelize.ENUM('Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 'WhatsApp', 'Telegram', 'Snapchat', 'Pinterest'),
          allowNull: false
        },
        handle: {
          type: Sequelize.STRING,
          allowNull: false
        },
        isVerified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        verifiedAt: {
          type: Sequelize.DATE
        },
        verificationStatus: {
          type: Sequelize.ENUM('pending', 'verified', 'failed', 'rejected'),
          defaultValue: 'pending'
        },
        verificationMessage: {
          type: Sequelize.TEXT
        },
        profileUrl: {
          type: Sequelize.STRING
        },
        metadata: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        lastUsedAt: {
          type: Sequelize.DATE
        },
        totalClicks: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        totalConversions: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        totalEarnings: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    });
    
    // Add indexes if needed
    // await queryInterface.addIndex('SocialMediaAccount', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SocialMediaAccount');
  }
};
