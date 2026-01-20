'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dentists', 'photoUrl', {
      type: Sequelize.STRING(255),
      allowNull: true
    })
    await queryInterface.addColumn('dentists', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true
    })
    await queryInterface.addColumn('dentists', 'specialties', {
      type: Sequelize.TEXT,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('dentists', 'specialties')
    await queryInterface.removeColumn('dentists', 'bio')
    await queryInterface.removeColumn('dentists', 'photoUrl')
  }
}
