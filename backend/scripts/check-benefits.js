const { sequelize, Feature, PackageBenefit, BenefitPackage } = require('../database/models.registry');

async function checkBenefits() {
  try {
    console.log('\n=== FEATURES (Finance/Meal/Delivery) ===');
    const features = await Feature.findAll({
      where: {
        category: ['Finance', 'Meal', 'Delivery']
      },
      attributes: ['code', 'name', 'category'],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    console.table(features.map(f => ({
      code: f.code,
      name: f.name,
      category: f.category
    })));

    console.log('\n=== BENEFIT PACKAGES ===');
    const packages = await BenefitPackage.findAll({
      where: { type: 'meal' },
      attributes: ['id', 'name'],
      include: [{
        model: PackageBenefit,
        as: 'benefits',
        attributes: ['id', 'featureCode', 'value']
      }]
    });

    for (const pkg of packages) {
      console.log(`\nPackage: ${pkg.name} (ID: ${pkg.id})`);
      for (const benefit of pkg.benefits) {
        console.log(`  - ${benefit.featureCode}:`, JSON.stringify(benefit.value, null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkBenefits();
