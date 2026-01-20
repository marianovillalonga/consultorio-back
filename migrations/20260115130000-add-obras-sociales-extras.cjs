'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('obras_sociales', 'copagoDefault', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    })
    await queryInterface.addColumn('obras_sociales', 'planes', {
      type: Sequelize.JSON,
      allowNull: true
    })
    await queryInterface.addColumn('obras_sociales', 'alertas', {
      type: Sequelize.JSON,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('obras_sociales', 'alertas')
    await queryInterface.removeColumn('obras_sociales', 'planes')
    await queryInterface.removeColumn('obras_sociales', 'copagoDefault')
  }
}
