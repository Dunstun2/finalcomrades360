const { Sequelize } = require('sequelize');
const dbConfig = require('./config/database');

const sequelize = new Sequelize(dbConfig.development);

async function verify() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Query raw counts without model definitions
    const [features] = await sequelize.query(
      `SELECT COUNT(*) as count FROM Feature WHERE category IN ('Meal', 'Delivery')`
    );
    const featureCount = features[0].count;

    const [packages] = await sequelize.query(
      `SELECT COUNT(*) as count FROM BenefitPackage WHERE name = 'Meal Premium Plus'`
    );
    const packageCount = packages[0].count;

    const [plans] = await sequelize.query(
      `SELECT COUNT(*) as count FROM Plan WHERE name = 'Meal Premium Plus'`
    );
    const planCount = plans[0].count;

    const [pkgId] = await sequelize.query(
      `SELECT id FROM BenefitPackage WHERE name = 'Meal Premium Plus' LIMIT 1`
    );
    
    let benefitCount = 0;
    if (pkgId.length > 0) {
      const [benefits] = await sequelize.query(
        `SELECT COUNT(*) as count FROM PackageBenefit WHERE packageId = ${pkgId[0].id}`
      );
      benefitCount = benefits[0].count;
    }

    console.log('📊 Migration Verification Results:');
    console.log('────────────────────────────────────');
    console.log('✅ Meal/Delivery Features created:', featureCount);
    console.log('✅ Benefit Package created:', packageCount);
    console.log('✅ Package Benefits linked:', benefitCount);
    console.log('✅ Subscription Plan created:', planCount);

    if (featureCount >= 4 && packageCount === 1 && benefitCount === 6 && planCount === 1) {
      console.log('\n🎉 All data successfully seeded!');
    } else {
      console.log('\n⚠️  Some records may be missing. Check counts above.');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
