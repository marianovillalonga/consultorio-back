'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('implants', 'createdByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
    await queryInterface.addColumn('implants', 'updatedByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('implants', 'updatedByUserId')
    await queryInterface.removeColumn('implants', 'createdByUserId')
  }
}
