'use strict';

/**
 * Migration: Seed Meal Subscription Features and Benefit Package
 * 
 * Creates a comprehensive set of features (free_delivery, reduced_delivery_fee, 
 * free_meals, meal_discount, priority_support, skip_meals) and a sample
 * "Meal Premium Plus" benefit package with configurations.
 * 
 * Idempotent: Safe to run multiple times (checks for existing records)
 * Database-agnostic: Works with SQLite and MySQL
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      // Step 1: Seed Features (using bulkCreate with ignoreDuplicates)
      const features = [
        {
          code: 'free_delivery',
          name: 'Free Delivery',
          category: 'Delivery',
          description: 'Free delivery on all meal orders',
          createdAt: now,
          updatedAt: now
        },
        {
          code: 'reduced_delivery_fee',
          name: 'Reduced Delivery Fee',
          category: 'Delivery',
          description: 'Discount percentage on delivery charges',
          createdAt: now,
          updatedAt: now
        },
        {
          code: 'free_meals',
          name: 'Free Meals Included',
          category: 'Meal',
          description: 'Complimentary meals per subscription cycle',
          createdAt: now,
          updatedAt: now
        },
        {
          code: 'meal_discount',
          name: 'Meal Discount',
          category: 'Meal',
          description: 'Percentage discount on all meal purchases',
          createdAt: now,
          updatedAt: now
        },
        {
          code: 'priority_support',
          name: 'Priority Support',
          category: 'Support',
          description: 'Fast-track customer support access',
          createdAt: now,
          updatedAt: now
        },
        {
          code: 'skip_meals',
          name: 'Skip Meals',
          category: 'Meal',
          description: 'Ability to skip upcoming meal deliveries',
          createdAt: now,
          updatedAt: now
        }
      ];

      // Insert features with ignore duplicates (database-agnostic)
      for (const feature of features) {
        try {
          await queryInterface.insert(
            null,
            'Feature',
            feature,
            { transaction }
          );
        } catch (err) {
          // Ignore duplicate key errors (feature already exists)
          if (!err.message.includes('UNIQUE constraint failed') && !err.message.includes('Duplicate entry')) {
            throw err;
          }
        }
      }

      // Step 2: Get or Create Benefit Package
      let existingPackage = await queryInterface.sequelize.query(
        `SELECT id FROM BenefitPackage WHERE name = ?`,
        {
          replacements: ['Meal Premium Plus'],
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      let packageId;
      if (existingPackage.length === 0) {
        // Package doesn't exist, create it
        const result = await queryInterface.insert(
          null,
          'BenefitPackage',
          {
            name: 'Meal Premium Plus',
            type: 'meal',
            description: 'Premium meal subscription with free delivery and discounts',
            createdAt: now,
            updatedAt: now
          },
          { transaction }
        );
        // Get the inserted package ID
        const packages = await queryInterface.sequelize.query(
          `SELECT id FROM BenefitPackage WHERE name = ?`,
          {
            replacements: ['Meal Premium Plus'],
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction
          }
        );
        packageId = packages[0].id;
      } else {
        packageId = existingPackage[0].id;
      }

      // Step 3: Link Features to Benefit Package via PackageBenefit
      const packageBenefits = [
        {
          packageId,
          featureCode: 'free_delivery',
          limitType: 'boolean',
          value: JSON.stringify({
            enabled: true,
            conditions: { minOrderValue: 500 }
          })
        },
        {
          packageId,
          featureCode: 'reduced_delivery_fee',
          limitType: 'rate',
          value: JSON.stringify({
            type: 'percentage',
            amount: 25,
            maxDiscount: 150,
            minOrderValue: 300
          })
        },
        {
          packageId,
          featureCode: 'free_meals',
          limitType: 'counter',
          value: JSON.stringify({
            limit: 4,
            resetPeriod: 'monthly',
            mealTypes: ['breakfast', 'lunch', 'dinner'],
            maxMealValue: 1000
          })
        },
        {
          packageId,
          featureCode: 'meal_discount',
          limitType: 'rate',
          value: JSON.stringify({
            type: 'percentage',
            amount: 10,
            excludeItems: ['premium_catering']
          })
        },
        {
          packageId,
          featureCode: 'priority_support',
          limitType: 'boolean',
          value: JSON.stringify({
            enabled: true,
            responseTime: '2 hours',
            supportChannels: ['chat', 'phone']
          })
        },
        {
          packageId,
          featureCode: 'skip_meals',
          limitType: 'boolean',
          value: JSON.stringify({
            enabled: true,
            skipsPerMonth: 2
          })
        }
      ];

      for (const benefit of packageBenefits) {
        try {
          // Check if benefit already exists
          const existing = await queryInterface.sequelize.query(
            `SELECT id FROM PackageBenefit WHERE packageId = ? AND featureCode = ?`,
            {
              replacements: [benefit.packageId, benefit.featureCode],
              type: queryInterface.sequelize.QueryTypes.SELECT,
              transaction
            }
          );

          if (existing.length === 0) {
            await queryInterface.insert(
              null,
              'PackageBenefit',
              {
                ...benefit,
                createdAt: now,
                updatedAt: now
              },
              { transaction }
            );
          }
        } catch (err) {
          // Ignore duplicate key errors
          if (!err.message.includes('UNIQUE constraint failed') && !err.message.includes('Duplicate entry')) {
            throw err;
          }
        }
      }

      // Step 4: Create Sample Plan
      try {
        const existingPlan = await queryInterface.sequelize.query(
          `SELECT id FROM Plan WHERE name = ?`,
          {
            replacements: ['Meal Premium Plus'],
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction
          }
        );

        if (existingPlan.length === 0) {
          await queryInterface.insert(
            null,
            'Plan',
            {
              name: 'Meal Premium Plus',
              price: 3999,
              billingCycle: 'monthly',
              type: 'meal',
              benefitPackageId: packageId,
              createdAt: now,
              updatedAt: now
            },
            { transaction }
          );
        }
      } catch (err) {
        // Ignore duplicate key errors
        if (!err.message.includes('UNIQUE constraint failed') && !err.message.includes('Duplicate entry')) {
          throw err;
        }
      }

      await transaction.commit();
      console.log('✅ Migration completed: Meal subscription features and benefit package seeded successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Remove in reverse order (dependency order)

      // 1. Remove the sample plan
      await queryInterface.bulkDelete('Plan', { name: 'Meal Premium Plus' }, { transaction });

      // 2. Get package ID
      const packages = await queryInterface.sequelize.query(
        `SELECT id FROM BenefitPackage WHERE name = ?`,
        {
          replacements: ['Meal Premium Plus'],
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (packages.length > 0) {
        const packageId = packages[0].id;

        // 2. Remove package benefits
        await queryInterface.bulkDelete(
          'PackageBenefit',
          { packageId },
          { transaction }
        );

        // 3. Remove the benefit package
        await queryInterface.bulkDelete(
          'BenefitPackage',
          { id: packageId },
          { transaction }
        );
      }

      // 4. Remove features
      const featureCodes = [
        'free_delivery',
        'reduced_delivery_fee',
        'free_meals',
        'meal_discount',
        'priority_support',
        'skip_meals'
      ];

      for (const code of featureCodes) {
        await queryInterface.bulkDelete('Feature', { code }, { transaction });
      }

      await transaction.commit();
      console.log('✅ Migration rollback: Meal subscription features and benefit package removed');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration rollback failed:', error.message);
      throw error;
    }
  }
};
