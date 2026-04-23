'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      clinicId: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      email: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      passwordHash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('ADMIN', 'ODONTOLOGO', 'RECEPCION', 'PACIENTE'), allowNull: false },
      active_status: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('patients', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      clinicId: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      fullName: { type: Sequelize.STRING(150), allowNull: false },
      dni: { type: Sequelize.STRING(30), allowNull: true },
      phone: { type: Sequelize.STRING(40), allowNull: true },
      email: { type: Sequelize.STRING(120), allowNull: true },
      obraSocial: { type: Sequelize.STRING(120), allowNull: true },
      obraSocialNumero: { type: Sequelize.STRING(80), allowNull: true },
      historialClinico: { type: Sequelize.TEXT, allowNull: true },
      treatmentPlan: { type: Sequelize.TEXT, allowNull: true },
      treatmentPlanItems: { type: Sequelize.TEXT, allowNull: true },
      studies: { type: Sequelize.TEXT, allowNull: true },
      studiesFiles: { type: Sequelize.TEXT, allowNull: true },
      historyEntries: { type: Sequelize.TEXT, allowNull: true },
      balance: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      payments: { type: Sequelize.JSON, allowNull: true },
      odontograma: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('dentists', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, unique: true },
      fullName: { type: Sequelize.STRING(150), allowNull: true },
      photoUrl: { type: Sequelize.STRING(255), allowNull: true },
      bio: { type: Sequelize.TEXT, allowNull: true },
      specialties: { type: Sequelize.TEXT, allowNull: true },
      license: { type: Sequelize.STRING(80), allowNull: true },
      specialty: { type: Sequelize.STRING(120), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('availabilities', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      dentistId: { type: Sequelize.INTEGER, allowNull: false },
      weekday: { type: Sequelize.INTEGER, allowNull: false },
      fromTime: { type: Sequelize.STRING(5), allowNull: false },
      toTime: { type: Sequelize.STRING(5), allowNull: false },
      slotMinutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('blocks', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      dentistId: { type: Sequelize.INTEGER, allowNull: false },
      fromDateTime: { type: Sequelize.DATE, allowNull: false },
      toDateTime: { type: Sequelize.DATE, allowNull: false },
      reason: { type: Sequelize.STRING(200), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('appointments', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      dentistId: { type: Sequelize.INTEGER, allowNull: false },
      patientId: { type: Sequelize.INTEGER, allowNull: false },
      startAt: { type: Sequelize.DATE, allowNull: false },
      endAt: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.ENUM('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'ASISTIO', 'NO_ASISTIO'), allowNull: false, defaultValue: 'PENDIENTE' },
      reason: { type: Sequelize.STRING(200), allowNull: true },
      createdByRole: { type: Sequelize.ENUM('PACIENTE', 'RECEPCION', 'ODONTOLOGO', 'ADMIN'), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('obras_sociales', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      numeroObraSocial: { type: Sequelize.STRING(50), allowNull: true },
      nombre: { type: Sequelize.STRING(150), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      telefono: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(120), allowNull: true },
      notas: { type: Sequelize.TEXT, allowNull: true },
      copagoDefault: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      planes: { type: Sequelize.JSON, allowNull: true },
      alertas: { type: Sequelize.JSON, allowNull: true },
      aranceles: { type: Sequelize.JSON, allowNull: true },
      normasTrabajoFileName: { type: Sequelize.STRING(200), allowNull: true },
      normasTrabajoFileData: { type: Sequelize.TEXT, allowNull: true },
      normasFacturacionFileName: { type: Sequelize.STRING(200), allowNull: true },
      normasFacturacionFileData: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('implants', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      clinicId: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      patientId: { type: Sequelize.INTEGER, allowNull: false },
      piece: { type: Sequelize.STRING(10), allowNull: false },
      maxillary: { type: Sequelize.ENUM('SUP', 'INF'), allowNull: true },
      status: {
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
      },
      implantType: { type: Sequelize.STRING(120), allowNull: true },
      length: { type: Sequelize.STRING(40), allowNull: true },
      diameter: { type: Sequelize.STRING(40), allowNull: true },
      brand: { type: Sequelize.STRING(120), allowNull: true },
      model: { type: Sequelize.STRING(120), allowNull: true },
      technique: { type: Sequelize.ENUM('CONVENCIONAL', 'GUIADA'), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      responsibleUserId: { type: Sequelize.INTEGER, allowNull: true },
      createdByUserId: { type: Sequelize.INTEGER, allowNull: true },
      updatedByUserId: { type: Sequelize.INTEGER, allowNull: true },
      statusHistory: { type: Sequelize.JSON, allowNull: true },
      planning: { type: Sequelize.JSON, allowNull: true },
      surgery: { type: Sequelize.JSON, allowNull: true },
      osteointegration: { type: Sequelize.JSON, allowNull: true },
      prosthesis: { type: Sequelize.JSON, allowNull: true },
      followups: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('user_permissions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      viewKey: { type: Sequelize.STRING(60), allowNull: false },
      canRead: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      canWrite: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      tokenHash: { type: Sequelize.STRING(255), allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: true },
      action: { type: Sequelize.STRING(80), allowNull: false },
      details: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('activation_tokens', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      tokenHash: { type: Sequelize.STRING(255), allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      usedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.createTable('reset_tokens', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      tokenHash: { type: Sequelize.STRING(255), allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      usedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    })

    await queryInterface.addIndex('appointments', ['dentistId', 'startAt'])
    await queryInterface.addIndex('users', ['clinicId'])
    await queryInterface.addIndex('patients', ['clinicId'])
    await queryInterface.addIndex('implants', ['patientId'])
    await queryInterface.addIndex('implants', ['patientId', 'piece'])
    await queryInterface.addIndex('implants', ['clinicId'])
    await queryInterface.addIndex('implants', ['clinicId', 'patientId'])
    await queryInterface.addIndex('user_permissions', ['userId', 'viewKey'], {
      unique: true,
      name: 'user_permissions_userId_viewKey'
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('reset_tokens')
    await queryInterface.dropTable('activation_tokens')
    await queryInterface.dropTable('audit_logs')
    await queryInterface.dropTable('refresh_tokens')
    await queryInterface.dropTable('user_permissions')
    await queryInterface.dropTable('implants')
    await queryInterface.dropTable('obras_sociales')
    await queryInterface.dropTable('appointments')
    await queryInterface.dropTable('blocks')
    await queryInterface.dropTable('availabilities')
    await queryInterface.dropTable('dentists')
    await queryInterface.dropTable('patients')
    await queryInterface.dropTable('users')
  }
}
