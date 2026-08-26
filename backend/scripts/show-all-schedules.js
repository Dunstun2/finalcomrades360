const { sequelize, MealSchedule, FastFood } = require('../database/models.registry');

async function showAllSchedules(subscriptionId) {
  try {
    const schedules = await MealSchedule.findAll({
      where: { subscriptionId },
      include: [{ model: FastFood, as: 'preferredFastFoodItem' }]
    });

    console.log(`\n📅 All schedule entries for subscription #${subscriptionId}:\n`);
    
    if (schedules.length === 0) {
      console.log('❌ No schedule entries found');
      return;
    }

    schedules.forEach((s, idx) => {
      console.log(`Entry ${idx + 1}:`);
      console.log(`  Day: ${s.dayOfWeek}`);
      console.log(`  Time: ${s.preferredTime}`);
      console.log(`  Meal Type: ${s.mealTimeType}`);
      console.log(`  Food ID: ${s.preferredFastFoodItemId}`);
      console.log(`  Food Name: ${s.preferredFastFoodItem?.name || 'Unknown'}`);
      console.log(`  Food Price: KES ${s.preferredFastFoodItem?.basePrice || s.preferredFastFoodItem?.displayPrice || 0}`);
      console.log(`  Pickup Station: ${s.pickupStationId || 'None'}`);
      console.log(`  Delivery Address: ${s.deliveryAddress || 'None'}`);
      console.log('');
    });

    // Calculate totals by day/time
    const grouped = {};
    schedules.forEach(s => {
      const key = `${s.dayOfWeek} ${s.preferredTime}`;
      if (!grouped[key]) grouped[key] = { items: [], total: 0 };
      const price = parseFloat(s.preferredFastFoodItem?.basePrice || s.preferredFastFoodItem?.displayPrice || 0);
      grouped[key].items.push({ name: s.preferredFastFoodItem?.name, price });
      grouped[key].total += price;
    });

    console.log('📊 Grouped by delivery time:\n');
    Object.entries(grouped).forEach(([key, data]) => {
      console.log(`${key}:`);
      data.items.forEach(item => {
        console.log(`  - ${item.name}: KES ${item.price}`);
      });
      console.log(`  TOTAL: KES ${data.total}`);
      console.log(`  Should get 6% discount: ${data.total >= 800 ? 'YES ✅' : 'NO ❌'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

const subId = process.argv[2] || 1;
showAllSchedules(parseInt(subId));
