import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const Patient = sequelize.define('Patient', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clinicId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    fullName: { type: DataTypes.STRING(150), allowNull: false },
    dni: { type: DataTypes.STRING(30), allowNull: true },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    email: { type: DataTypes.STRING(120), allowNull: true },
    obraSocial: { type: DataTypes.STRING(120), allowNull: true },
    obraSocialNumero: { type: DataTypes.STRING(80), allowNull: true },
    historialClinico: { type: DataTypes.TEXT, allowNull: true },
    treatmentPlan: { type: DataTypes.TEXT, allowNull: true },
    treatmentPlanItems: { type: DataTypes.TEXT, allowNull: true },
    studies: { type: DataTypes.TEXT, allowNull: true },
    studiesFiles: { type: DataTypes.TEXT, allowNull: true },
    historyEntries: { type: DataTypes.TEXT, allowNull: true },
    balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    payments: { type: DataTypes.JSON, allowNull: true },
    odontograma: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'patients',
    timestamps: true
})
