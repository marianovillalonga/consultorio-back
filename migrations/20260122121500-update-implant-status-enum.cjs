'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('implants', 'status', {
      type: Sequelize.ENUM(
        'PLANIFICADO',
        'COLOCADO',
        'OSTEOINTEGRACION',
        'PROTESIS',
        'CONTROL',
        'FALLIDO',
        'RETIRADO'
      ),
      allowNull: false,
      defaultValue: 'PLANIFICADO'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('implants', 'status', {
      type: Sequelize.ENUM(
        'PLANIFICADO',
        'COLOCADO',
        'OSTEOINTEGRACION',
        'PROTESIS',
        'FALLIDO',
        'SEGUIMIENTO'
      ),
      allowNull: false,
      defaultValue: 'PLANIFICADO'
    })
  }
}
