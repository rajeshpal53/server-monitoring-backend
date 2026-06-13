'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('error_assignments', {
      id: {
        type:          Sequelize.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
      },
      error_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'error_logs', key: 'id' },
        onDelete:   'CASCADE',
      },
      assigned_to: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      assigned_by: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      notes: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      resolved_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      assigned_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('error_assignments', ['error_id']);
    await queryInterface.addIndex('error_assignments', ['assigned_to']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('error_assignments');
  },
};
