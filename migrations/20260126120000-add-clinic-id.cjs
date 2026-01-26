'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'clinicId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    })
    await queryInterface.addColumn('patients', 'clinicId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    })
    await queryInterface.addColumn('implants', 'clinicId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    })

    await queryInterface.sequelize.query('UPDATE users SET clinicId = 1 WHERE clinicId IS NULL')
    await queryInterface.sequelize.query('UPDATE patients SET clinicId = 1 WHERE clinicId IS NULL')
    await queryInterface.sequelize.query('UPDATE implants SET clinicId = 1 WHERE clinicId IS NULL')

    await queryInterface.addIndex('users', ['clinicId'])
    await queryInterface.addIndex('patients', ['clinicId'])
    await queryInterface.addIndex('implants', ['clinicId'])
    await queryInterface.addIndex('implants', ['clinicId', 'patientId'])
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('implants', ['clinicId', 'patientId'])
    await queryInterface.removeIndex('implants', ['clinicId'])
    await queryInterface.removeIndex('patients', ['clinicId'])
    await queryInterface.removeIndex('users', ['clinicId'])

    await queryInterface.removeColumn('implants', 'clinicId')
    await queryInterface.removeColumn('patients', 'clinicId')
    await queryInterface.removeColumn('users', 'clinicId')
  }
}
