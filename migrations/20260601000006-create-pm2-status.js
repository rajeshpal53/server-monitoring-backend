'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pm2_status', {
      id: {
        type:          Sequelize.BIGINT,
        primaryKey:    true,
        autoIncrement: true,
      },
      application_id: {
        type:       Sequelize.INTEGER,
        allowNull:  true,
        references: { model: 'applications', key: 'id' },
        onDelete:   'SET NULL',
      },
      server_name: {
        type:      Sequelize.STRING(100),
        allowNull: false,
      },
      process_name: {
        type:      Sequelize.STRING(100),
        allowNull: false,
      },
      pm2_id: {
        type:      Sequelize.INTEGER,
        allowNull: true,
      },
      pid: {
        type:      Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type:      Sequelize.ENUM('online', 'stopped', 'errored', 'restarting', 'launching'),
        allowNull: false,
      },
      cpu_usage: {
        type:      Sequelize.FLOAT,
        allowNull: true,
      },
      memory_usage: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      uptime: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      restart_count: {
        type:         Sequelize.INTEGER,
        allowNull:    false,
        defaultValue: 0,
      },
      recorded_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pm2_status', ['server_name', 'recorded_at']);
    await queryInterface.addIndex('pm2_status', ['process_name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pm2_status');
  },
};
