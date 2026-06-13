'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('applications', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
      },
      app_name: {
        type:      Sequelize.STRING(100),
        allowNull: false,
        unique:    true,
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      environment: {
        type:         Sequelize.ENUM('development', 'staging', 'production'),
        allowNull:    false,
        defaultValue: 'production',
      },
      server_name: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      health_url: {
        type:      Sequelize.STRING(500),
        allowNull: true,
      },
      api_key: {
        type:      Sequelize.STRING(64),
        allowNull: false,
        unique:    true,
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
        defaultValue: true,
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('applications');
  },
};
