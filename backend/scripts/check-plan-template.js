const { sequelize, Plan, FastFood } = require('../database/models.registry');

async function checkPlanTemplate() {
  try {
    const plans = await Plan.findAll({ where: { type: 'meal' } });

    for (const plan of plans) {
      console.log(`\nPlan: ${plan.name} (ID: ${plan.id})`);
      console.log(`templateSchedule:`, JSON.stringify(plan.templateSchedule, null, 2));

      if (Array.isArray(plan.templateSchedule) && plan.templateSchedule.length > 0) {
        const ids = plan.templateSchedule.map(e => e.fastFoodItemId).filter(Boolean);
        console.log(`\nFood IDs referenced:`, ids);

        if (ids.length > 0) {
          const foods = await FastFood.findAll({ where: { id: ids }, attributes: ['id','name','basePrice','displayPrice'] });
          console.log(`\nFood items found in DB:`);
          foods.forEach(f => console.log(`  ${f.id}: ${f.name} - KES ${f.basePrice || f.displayPrice}`));

          const missing = ids.filter(id => !foods.find(f => f.id === id));
          if (missing.length > 0) console.log(`\n❌ MISSING food IDs:`, missing);
          else console.log(`\n✅ All food items found`);
        } else {
          console.log(`\n⚠️ No fastFoodItemId found in templateSchedule entries`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

checkPlanTemplate();
