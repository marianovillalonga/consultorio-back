'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('patients', 'treatmentPlanItems', {
      type: Sequelize.TEXT,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('patients', 'treatmentPlanItems')
  }
}
