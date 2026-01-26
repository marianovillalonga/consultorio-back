'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('implants', 'statusHistory', {
      type: Sequelize.JSON,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('implants', 'statusHistory')
  }
}
