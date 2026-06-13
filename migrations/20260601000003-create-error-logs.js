'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('error_logs', {
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
      environment: {
        type:         Sequelize.ENUM('development', 'staging', 'production'),
        allowNull:    false,
        defaultValue: 'production',
      },
      endpoint: {
        type:      Sequelize.STRING(500),
        allowNull: true,
      },
      method: {
        type:      Sequelize.STRING(10),
        allowNull: true,
      },
      severity: {
        type:         Sequelize.ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL'),
        allowNull:    false,
        defaultValue: 'ERROR',
      },
      status: {
        type:         Sequelize.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'),
        allowNull:    false,
        defaultValue: 'OPEN',
      },
      error_message: {
        type:      Sequelize.TEXT,
        allowNull: false,
      },
      stack_trace: {
        type:      'LONGTEXT',
        allowNull: true,
      },
      request_body: {
        type:      Sequelize.JSON,
        allowNull: true,
      },
      user_id: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      server_name: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      occurrence_count: {
        type:         Sequelize.INTEGER,
        allowNull:    false,
        defaultValue: 1,
      },
      first_seen_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      last_seen_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('error_logs', ['application_id', 'created_at', 'status', 'severity']);
    await queryInterface.addIndex('error_logs', ['severity']);
    await queryInterface.addIndex('error_logs', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('error_logs');
  },
};
