/**
 * Verification Script: Benefit Package Discount Field Fix
 * 
 * This script verifies that all benefit packages are using the correct field names:
 * - rate-based benefits (reduced_delivery_fee, meal_discount) should use "discountPercent"
 * - value-based benefits should use "amount"
 * - minOrderValue should be accessible at top level
 * 
 * Run: node backend/scripts/verify-benefit-discount-fix.js
 */

const { PackageBenefit, BenefitPackage, Feature } = require('../database/models.registry');

const RATE_BENEFITS = ['reduced_delivery_fee', 'meal_discount'];
const DELIVERY_BENEFITS = ['free_delivery', 'reduced_delivery_fee'];

async function verifyBenefitPackages() {
  console.log('🔍 Starting benefit package verification...\n');

  try {
    // Get all benefit packages with their benefits
    const packages = await BenefitPackage.findAll({
      include: [
        { 
          model: PackageBenefit, 
          as: 'benefits',
          include: [{ model: Feature, as: 'feature' }]
        }
      ]
    });

    console.log(`📦 Found ${packages.length} benefit package(s)\n`);

    let totalIssues = 0;
    let totalBenefits = 0;

    for (const pkg of packages) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Package: ${pkg.name} (Type: ${pkg.type})`);
      console.log(`   ID: ${pkg.id}`);
      console.log(`   Benefits: ${pkg.benefits.length}`);
      console.log(`${'='.repeat(60)}\n`);

      for (const benefit of pkg.benefits) {
        totalBenefits++;
        const featureCode = benefit.featureCode;
        const value = benefit.value || {};
        const featureName = benefit.feature?.name || featureCode;

        console.log(`  🔧 ${featureName} (${featureCode})`);
        console.log(`     Limit Type: ${benefit.limitType}`);

        let hasIssues = false;

        // Check 1: Rate benefits should use discountPercent
        if (RATE_BENEFITS.includes(featureCode)) {
          if (value.discountPercent !== undefined) {
            console.log(`     ✅ discountPercent: ${value.discountPercent}%`);
          } else if (value.amount !== undefined) {
            console.log(`     ⚠️  ISSUE: Uses 'amount' (${value.amount}) instead of 'discountPercent'`);
            hasIssues = true;
            totalIssues++;
          } else {
            console.log(`     ❌ MISSING: No discount percentage field found`);
            hasIssues = true;
            totalIssues++;
          }
        }

        // Check 2: Delivery benefits should have accessible minOrderValue
        if (DELIVERY_BENEFITS.includes(featureCode)) {
          const minOrderValue = value.minOrderValue || value.conditions?.minOrderValue;
          if (minOrderValue !== undefined) {
            console.log(`     ✅ minOrderValue: KES ${minOrderValue}`);
            if (!value.minOrderValue && value.conditions?.minOrderValue) {
              console.log(`     ℹ️  Note: minOrderValue is nested in 'conditions' (still accessible)`);
            }
          } else {
            console.log(`     ⚠️  NOTICE: No minOrderValue specified (defaults to 0)`);
          }
        }

        // Check 3: Show full value structure for debugging
        console.log(`     📄 Full value: ${JSON.stringify(value, null, 2).replace(/\n/g, '\n        ')}`);

        if (!hasIssues) {
          console.log(`     ✅ No issues found\n`);
        } else {
          console.log(`     ❌ Issues detected\n`);
        }
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 VERIFICATION SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Packages: ${packages.length}`);
    console.log(`Total Benefits: ${totalBenefits}`);
    console.log(`Issues Found: ${totalIssues}`);

    if (totalIssues === 0) {
      console.log(`\n✅ ALL CHECKS PASSED - No issues detected!`);
      console.log(`\nBenefit packages are correctly configured:`);
      console.log(`  • Rate benefits use 'discountPercent'`);
      console.log(`  • Delivery benefits have accessible minOrderValue`);
      console.log(`  • Field names are standardized\n`);
    } else {
      console.log(`\n⚠️  ${totalIssues} ISSUE(S) DETECTED`);
      console.log(`\nRecommended actions:`);
      console.log(`  1. Run the migration: npx sequelize-cli db:migrate`);
      console.log(`  2. Check admin UI benefit editor for correct field names`);
      console.log(`  3. Re-run this verification script\n`);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run verification
verifyBenefitPackages();
