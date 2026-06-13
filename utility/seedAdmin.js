/**
 * One-time script to create the first super admin.
 * Usage: node utility/seedAdmin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');

const { sequelize, User } = require('../models/index');

const NAME     = process.env.SEED_NAME     || 'Super Admin';
const EMAIL    = process.env.SEED_EMAIL    || 'admin@wertone.com';
const PASSWORD = process.env.SEED_PASSWORD || 'Admin@1234';

(async () => {
  try {
    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email: EMAIL } });
    if (existing) {
      console.log(`User already exists: ${EMAIL}`);
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const user = await User.create({
      name: NAME,
      email: EMAIL,
      password_hash,
      role: 'super_admin',
    });

    console.log('✅ Super admin created:');
    console.log(`   Name  : ${user.name}`);
    console.log(`   Email : ${user.email}`);
    console.log(`   Role  : ${user.role}`);
    console.log(`   Pass  : ${PASSWORD}`);
    console.log('\n⚠️  Change the password after first login.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
})();
