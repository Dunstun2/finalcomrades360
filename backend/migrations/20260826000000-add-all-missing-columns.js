'use strict';

/**
 * Comprehensive migration to add all missing columns
 * Checks for existence before adding to prevent errors
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    console.log('🔄 Starting comprehensive column addition migration...');

    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch (error) {
        console.log(`⚠️ Table ${tableName} does not exist`);
        return false;
      }
    };

    // Helper function to safely add column
    const addColumnIfMissing = async (tableName, columnName, definition) => {
      const exists = await columnExists(tableName, columnName);
      if (!exists) {
        try {
          await queryInterface.addColumn(tableName, columnName, definition);
          console.log(`✅ Added column ${tableName}.${columnName}`);
        } catch (error) {
          console.log(`⚠️ Could not add ${tableName}.${columnName}: ${error.message}`);
        }
      } else {
        console.log(`⏭️ Column ${tableName}.${columnName} already exists, skipping`);
      }
    };

    // ==========================================
    // ORDER TABLE - Payment Verification Fields
    // ==========================================
    console.log('\n📦 Processing Order table...');
    
    await addColumnIfMissing('Order', 'needsPaymentVerification', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this order requires manual payment verification'
    });

    await addColumnIfMissing('Order', 'paymentVerificationStatus', {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
      comment: 'Status of payment verification'
    });

    await addColumnIfMissing('Order', 'paymentVerifiedAt', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When payment was verified by admin'
    });

    await addColumnIfMissing('Order', 'paymentVerifiedBy', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID of admin who verified payment'
    });

    await addColumnIfMissing('Order', 'paymentRejectionReason', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for payment rejection'
    });

    await addColumnIfMissing('Order', 'guestData', {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Guest user information (name, email, phone) for subscription orders'
    });

    await addColumnIfMissing('Order', 'subscriptionId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Associated subscription ID for subscription orders'
    });

    // ==========================================
    // HEROPROMOTION TABLE - Video & Scheduling
    // ==========================================
    console.log('\n📦 Processing HeroPromotions table...');

    // Detect actual table name (HeroPromotions vs HeroPromotion)
    const tables = await queryInterface.showAllTables();
    const heroPromotionTable = tables.includes('HeroPromotions') 
      ? 'HeroPromotions' 
      : tables.includes('HeroPromotion')
        ? 'HeroPromotion'
        : null;

    if (!heroPromotionTable) {
      console.log('⚠️ HeroPromotion table not found, skipping...');
    } else {
      // Video fields
      await addColumnIfMissing(heroPromotionTable, 'videoUrl', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL to video file or YouTube/Vimeo embed'
      });

      await addColumnIfMissing(heroPromotionTable, 'videoType', {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'background',
        comment: 'Video type: background, overlay, or embed'
      });

      await addColumnIfMissing(heroPromotionTable, 'videoAutoplay', {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      });

      await addColumnIfMissing(heroPromotionTable, 'videoLoop', {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      });

      await addColumnIfMissing(heroPromotionTable, 'videoMuted', {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      });

      // Scheduling fields
      await addColumnIfMissing(heroPromotionTable, 'scheduleType', {
        type: DataTypes.STRING,
        defaultValue: 'continuous',
        comment: 'continuous, recurring, or specific_dates'
      });

      await addColumnIfMissing(heroPromotionTable, 'recurringDays', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array of days: [0,1,2,3,4,5,6] for Sun-Sat'
      });

      await addColumnIfMissing(heroPromotionTable, 'specificDates', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array of dates: ["2026-09-01", "2026-09-15"]'
      });

      await addColumnIfMissing(heroPromotionTable, 'timeSlotStart', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Start time in HH:MM format'
      });

      await addColumnIfMissing(heroPromotionTable, 'timeSlotEnd', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'End time in HH:MM format'
      });

      await addColumnIfMissing(heroPromotionTable, 'timezone', {
        type: DataTypes.STRING,
        defaultValue: 'Africa/Nairobi',
        comment: 'Timezone for time slots'
      });

      await addColumnIfMissing(heroPromotionTable, 'dateTimeMode', {
        type: DataTypes.STRING,
        defaultValue: 'same',
        comment: 'same or different (per-date times)'
      });

      await addColumnIfMissing(heroPromotionTable, 'dateSpecificTimes', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON object with per-date time ranges'
      });

      await addColumnIfMissing(heroPromotionTable, 'ctaText', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Call-to-action button text'
      });

      await addColumnIfMissing(heroPromotionTable, 'eyebrow', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Small text above main heading'
      });
    }

    // ==========================================
    // SUBSCRIPTION TABLE - Lifecycle Fields
    // ==========================================
    console.log('\n📦 Processing Subscription table...');

    await addColumnIfMissing('Subscription', 'activatedAt', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When subscription was activated after payment verification'
    });

    await addColumnIfMissing('Subscription', 'cancelledAt', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When subscription was cancelled'
    });

    await addColumnIfMissing('Subscription', 'cancellationReason', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for subscription cancellation'
    });

    console.log('\n✅ Comprehensive column addition migration completed!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rolling back comprehensive column additions...');

    // Helper function to safely remove column
    const removeColumnIfExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        if (tableDescription[columnName]) {
          await queryInterface.removeColumn(tableName, columnName);
          console.log(`✅ Removed column ${tableName}.${columnName}`);
        }
      } catch (error) {
        console.log(`⚠️ Could not remove ${tableName}.${columnName}: ${error.message}`);
      }
    };

    // Remove Order columns
    await removeColumnIfExists('Order', 'needsPaymentVerification');
    await removeColumnIfExists('Order', 'paymentVerificationStatus');
    await removeColumnIfExists('Order', 'paymentVerifiedAt');
    await removeColumnIfExists('Order', 'paymentVerifiedBy');
    await removeColumnIfExists('Order', 'paymentRejectionReason');
    await removeColumnIfExists('Order', 'guestData');
    await removeColumnIfExists('Order', 'subscriptionId');

    // Detect and remove HeroPromotion columns
    const tables = await queryInterface.showAllTables();
    const heroPromotionTable = tables.includes('HeroPromotions') 
      ? 'HeroPromotions' 
      : tables.includes('HeroPromotion')
        ? 'HeroPromotion'
        : null;

    if (heroPromotionTable) {
      await removeColumnIfExists(heroPromotionTable, 'videoUrl');
      await removeColumnIfExists(heroPromotionTable, 'videoType');
      await removeColumnIfExists(heroPromotionTable, 'videoAutoplay');
      await removeColumnIfExists(heroPromotionTable, 'videoLoop');
      await removeColumnIfExists(heroPromotionTable, 'videoMuted');
      await removeColumnIfExists(heroPromotionTable, 'scheduleType');
      await removeColumnIfExists(heroPromotionTable, 'recurringDays');
      await removeColumnIfExists(heroPromotionTable, 'specificDates');
      await removeColumnIfExists(heroPromotionTable, 'timeSlotStart');
      await removeColumnIfExists(heroPromotionTable, 'timeSlotEnd');
      await removeColumnIfExists(heroPromotionTable, 'timezone');
      await removeColumnIfExists(heroPromotionTable, 'dateTimeMode');
      await removeColumnIfExists(heroPromotionTable, 'dateSpecificTimes');
      await removeColumnIfExists(heroPromotionTable, 'ctaText');
      await removeColumnIfExists(heroPromotionTable, 'eyebrow');
    }

    // Remove Subscription columns
    await removeColumnIfExists('Subscription', 'activatedAt');
    await removeColumnIfExists('Subscription', 'cancelledAt');
    await removeColumnIfExists('Subscription', 'cancellationReason');

    console.log('✅ Rollback completed!');
  }
};
