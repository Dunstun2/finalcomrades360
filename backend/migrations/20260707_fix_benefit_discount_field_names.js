'use strict';

/**
 * Migration: Fix Benefit Package Discount Field Names
 * 
 * Updates existing benefit packages to use standardized field names:
 * - Changes `amount` to `discountPercent` for reduced_delivery_fee and meal_discount
 * - Ensures both `minOrderValue` and `conditions.minOrderValue` are set correctly
 * 
 * This migration fixes discrepancies between:
 * 1. Backend calculation logic (expects discountPercent)
 * 2. Frontend display components (expect discountPercent)
 * 3. Original seed data (used "amount" instead)
 * 
 * Database-agnostic: Works with SQLite and MySQL
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('🔧 Starting benefit package discount field standardization...');

      // Get all PackageBenefit records with rate-based discounts
      const benefits = await queryInterface.sequelize.query(
        `SELECT id, packageId, featureCode, value FROM PackageBenefit 
         WHERE featureCode IN ('reduced_delivery_fee', 'meal_discount', 'free_delivery')`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log(`📊 Found ${benefits.length} benefit records to check`);

      for (const benefit of benefits) {
        let valueObj;
        try {
          valueObj = typeof benefit.value === 'string' 
            ? JSON.parse(benefit.value) 
            : benefit.value;
        } catch (err) {
          console.warn(`⚠️  Could not parse value for benefit #${benefit.id}:`, benefit.value);
          continue;
        }

        let updated = false;

        // Fix 1: Rename "amount" to "discountPercent" for percentage-based discounts
        if ((benefit.featureCode === 'reduced_delivery_fee' || benefit.featureCode === 'meal_discount')) {
          if (valueObj.amount !== undefined && valueObj.discountPercent === undefined) {
            valueObj.discountPercent = valueObj.amount;
            delete valueObj.amount;
            updated = true;
            console.log(`  ✓ Renamed 'amount' → 'discountPercent' for ${benefit.featureCode} (${valueObj.discountPercent}%)`);
          }
        }

        // Fix 2: Ensure minOrderValue is set at top level for free_delivery benefits
        if (benefit.featureCode === 'free_delivery') {
          if (valueObj.conditions?.minOrderValue !== undefined && valueObj.minOrderValue === undefined) {
            valueObj.minOrderValue = valueObj.conditions.minOrderValue;
            updated = true;
            console.log(`  ✓ Added top-level minOrderValue for free_delivery (${valueObj.minOrderValue})`);
          }
        }

        // Fix 3: Ensure minOrderValue is set for reduced_delivery_fee
        if (benefit.featureCode === 'reduced_delivery_fee') {
          if (valueObj.minOrderValue === undefined && valueObj.conditions?.minOrderValue === undefined) {
            // Set a sensible default if completely missing
            valueObj.minOrderValue = 0;
            updated = true;
            console.log(`  ✓ Added default minOrderValue=0 for reduced_delivery_fee`);
          } else if (valueObj.conditions?.minOrderValue !== undefined && valueObj.minOrderValue === undefined) {
            valueObj.minOrderValue = valueObj.conditions.minOrderValue;
            updated = true;
            console.log(`  ✓ Copied minOrderValue from conditions for reduced_delivery_fee`);
          }
        }

        // Update the record if changed
        if (updated) {
          const newValue = JSON.stringify(valueObj);
          await queryInterface.sequelize.query(
            `UPDATE PackageBenefit SET value = ? WHERE id = ?`,
            {
              replacements: [newValue, benefit.id],
              type: queryInterface.sequelize.QueryTypes.UPDATE,
              transaction
            }
          );
          console.log(`  💾 Updated benefit #${benefit.id}`);
        }
      }

      await transaction.commit();
      console.log('✅ Migration completed: Benefit package discount fields standardized');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('🔄 Reverting benefit package discount field changes...');

      // Get all PackageBenefit records
      const benefits = await queryInterface.sequelize.query(
        `SELECT id, packageId, featureCode, value FROM PackageBenefit 
         WHERE featureCode IN ('reduced_delivery_fee', 'meal_discount')`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      for (const benefit of benefits) {
        let valueObj;
        try {
          valueObj = typeof benefit.value === 'string' 
            ? JSON.parse(benefit.value) 
            : benefit.value;
        } catch (err) {
          continue;
        }

        let updated = false;

        // Revert: Rename "discountPercent" back to "amount"
        if (valueObj.discountPercent !== undefined && valueObj.amount === undefined) {
          valueObj.amount = valueObj.discountPercent;
          delete valueObj.discountPercent;
          updated = true;
        }

        if (updated) {
          const newValue = JSON.stringify(valueObj);
          await queryInterface.sequelize.query(
            `UPDATE PackageBenefit SET value = ? WHERE id = ?`,
            {
              replacements: [newValue, benefit.id],
              type: queryInterface.sequelize.QueryTypes.UPDATE,
              transaction
            }
          );
        }
      }

      await transaction.commit();
      console.log('✅ Rollback completed');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
