'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
      },
      name: {
        type:      Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type:      Sequelize.STRING(150),
        allowNull: false,
        unique:    true,
      },
      password_hash: {
        type:      Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type:         Sequelize.ENUM('super_admin', 'admin', 'developer', 'viewer'),
        allowNull:    false,
        defaultValue: 'developer',
      },
      telegram_chat_id: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
        defaultValue: true,
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type:      Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
