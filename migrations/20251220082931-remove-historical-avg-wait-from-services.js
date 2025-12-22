'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('services', 'historical_avg_wait');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('services', 'historical_avg_wait', {
      type: Sequelize.INTEGER
    });
  }
};