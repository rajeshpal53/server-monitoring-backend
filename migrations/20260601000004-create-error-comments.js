'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('error_comments', {
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
      user_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      comment: {
        type:      Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('error_comments', ['error_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('error_comments');
  },
};
