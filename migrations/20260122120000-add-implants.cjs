'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('implants', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      patientId: { type: Sequelize.INTEGER, allowNull: false },
      piece: { type: Sequelize.STRING(10), allowNull: false },
      maxillary: { type: Sequelize.ENUM('SUP', 'INF'), allowNull: true },
      status: {
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
      },
      implantType: { type: Sequelize.STRING(120), allowNull: true },
      length: { type: Sequelize.STRING(40), allowNull: true },
      diameter: { type: Sequelize.STRING(40), allowNull: true },
      brand: { type: Sequelize.STRING(120), allowNull: true },
      model: { type: Sequelize.STRING(120), allowNull: true },
      technique: { type: Sequelize.ENUM('CONVENCIONAL', 'GUIADA'), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      responsibleUserId: { type: Sequelize.INTEGER, allowNull: true },
      planning: { type: Sequelize.JSON, allowNull: true },
      surgery: { type: Sequelize.JSON, allowNull: true },
      osteointegration: { type: Sequelize.JSON, allowNull: true },
      prosthesis: { type: Sequelize.JSON, allowNull: true },
      followups: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.addIndex('implants', ['patientId'])
    await queryInterface.addIndex('implants', ['patientId', 'piece'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('implants')
  }
}
