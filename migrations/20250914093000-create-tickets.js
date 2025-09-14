'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('tickets', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      line_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lines',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'waiting'
      },
      joined_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      served_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      waiting_time: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      queue_length_at_join: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addConstraint('tickets', {
      fields: ['user_id'],
      type: 'unique',
      name: 'unique_user_id'
    });

    // Check constraint for status
    await queryInterface.sequelize.query(`
      ALTER TABLE "tickets"
      ADD CONSTRAINT status_check
      CHECK (status IN ('waiting', 'serving', 'done', 'cancelled'))
    `);
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable('tickets');
  }
};
