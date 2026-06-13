'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('server_metrics', {
      id: {
        type:          Sequelize.BIGINT,
        primaryKey:    true,
        autoIncrement: true,
      },
      server_name: {
        type:      Sequelize.STRING(100),
        allowNull: false,
      },
      cpu_usage: {
        type:      Sequelize.FLOAT,
        allowNull: true,
      },
      ram_used: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      ram_total: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      disk_used: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      disk_total: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      network_in: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      network_out: {
        type:      Sequelize.BIGINT,
        allowNull: true,
      },
      recorded_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('server_metrics', ['server_name', 'recorded_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('server_metrics');
  },
};
