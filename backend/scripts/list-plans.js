const { sequelize, Plan, BenefitPackage } = require('../database/models.registry');

async function listPlans() {
  try {
    const plans = await Plan.findAll({
      include: [{ model: BenefitPackage, as: 'benefitPackage' }]
    });

    console.log('\n=== MEAL PLANS ===\n');
    
    plans.forEach(plan => {
      console.log(`ID: ${plan.id}`);
      console.log(`  Name: ${plan.name}`);
      console.log(`  Type: ${plan.type}`);
      console.log(`  Price: KES ${plan.price}`);
      console.log(`  Benefit Package: ${plan.benefitPackage?.name || 'None'}`);
      console.log(`  Benefit Package ID: ${plan.benefitPackageId || 'None'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

listPlans();
