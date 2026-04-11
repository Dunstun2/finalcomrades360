const { User, FastFood } = require('./models');

async function approveFastFoodForSeller(email) {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log(`User with email ${email} not found.`);
      process.exit(1);
    }

    const sellerId = user.id;
    console.log(`Found seller with ID: ${sellerId}`);

    const [updatedCount] = await FastFood.update(
      { approved: true, status: 'active' }, // Assuming status should also be active
      { where: { vendor: sellerId } }
    );

    console.log(`Successfully approved ${updatedCount} fast food items for ${email}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error approving fast food:', error);
    process.exit(1);
  }
}

approveFastFoodForSeller('dunstunwambutsi20@gmail.com');
