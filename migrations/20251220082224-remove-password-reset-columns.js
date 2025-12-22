'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'password_reset_token');
    await queryInterface.removeColumn('users', 'password_reset_expires');
    await queryInterface.removeColumn('users', 'password_changed_at');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'password_reset_token', {
      type: Sequelize.STRING(255)
    });
    await queryInterface.addColumn('users', 'password_reset_expires', {
      type: Sequelize.DATE
    });
    await queryInterface.addColumn('users', 'password_changed_at', {
      type: Sequelize.DATE
    });
  }
};