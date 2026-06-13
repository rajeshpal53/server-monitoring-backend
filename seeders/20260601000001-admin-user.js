'use strict';
const bcrypt = require('bcryptjs');

const NAME     = process.env.SEED_NAME     || 'Super Admin';
const EMAIL    = process.env.SEED_EMAIL    || 'admin@wertone.com';
const PASSWORD = process.env.SEED_PASSWORD || 'Admin@1234';

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.rawSelect(
      'users',
      { where: { email: EMAIL }, plain: true },
      ['id'],
    );

    if (existing) {
      console.log(`Admin user already exists: ${EMAIL} — skipping seed`);
      return;
    }

    const password_hash = await bcrypt.hash(PASSWORD, 10);
    const now = new Date();

    await queryInterface.bulkInsert('users', [{
      name:          NAME,
      email:         EMAIL,
      password_hash,
      role:          'super_admin',
      is_active:     true,
      created_at:    now,
      updated_at:    now,
    }]);

    console.log(`Admin seeded → ${EMAIL} / ${PASSWORD}`);
    console.log('Change the password after first login.');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: EMAIL }, {});
  },
};
