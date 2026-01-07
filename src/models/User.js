import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('ADMIN', 'ODONTOLOGO', 'RECEPCION', 'PACIENTE'), allowNull: false },
    activeStatus: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'active_status' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'users',
    timestamps: true
})
