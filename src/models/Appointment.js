import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const Appointment = sequelize.define('Appointment', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    dentistId: { type: DataTypes.INTEGER, allowNull: false },
    patientId: { type: DataTypes.INTEGER, allowNull: false },
    startAt: { type: DataTypes.DATE, allowNull: false },
    endAt: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'ASISTIO', 'NO_ASISTIO'), allowNull: false, defaultValue: 'PENDIENTE' },
    reason: { type: DataTypes.STRING(200), allowNull: true },
    createdByRole: { type: DataTypes.ENUM('PACIENTE', 'RECEPCION', 'ODONTOLOGO', 'ADMIN'), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'appointments',
    timestamps: true,
    indexes: [
        { fields: ['dentistId', 'startAt'] }
    ]
})
