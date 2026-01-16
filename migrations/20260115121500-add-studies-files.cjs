'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('patients', 'studiesFiles', {
      type: Sequelize.TEXT,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('patients', 'studiesFiles')
  }
}
