'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('app_health', {
      id: {
        type:          Sequelize.BIGINT,
        primaryKey:    true,
        autoIncrement: true,
      },
      application_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'applications', key: 'id' },
        onDelete:   'CASCADE',
      },
      health_url: {
        type:      Sequelize.STRING(500),
        allowNull: false,
      },
      status_code: {
        type:      Sequelize.INTEGER,
        allowNull: true,
      },
      response_time_ms: {
        type:      Sequelize.INTEGER,
        allowNull: true,
      },
      is_up: {
        type:      Sequelize.BOOLEAN,
        allowNull: false,
      },
      error_message: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      checked_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('app_health', ['application_id', 'checked_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('app_health');
  },
};
