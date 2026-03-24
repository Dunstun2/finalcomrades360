const { User } = require('./models/index');

async function makeSuperAdmin() {
  try {
    const user = await User.findOne({ where: { email: 'dunstunw@gmail.com' } });
    if (!user) {
      console.log('User dunstunw@gmail.com not found.');
      process.exit(1);
    }
    
    // Force update the roles array even if user is already a superadmin

    // Update role and roles array explicitly with a new array
    const roles = ['superadmin', 'super_admin', 'admin'];

    await user.update({
      role: 'superadmin',
      roles: roles,
      emailVerified: true // verify email just in case
    });
    
    console.log('Successfully updated dunstunw@gmail.com to superadmin.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  }
}

makeSuperAdmin();
