import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING(80), allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'audit_logs',
    timestamps: true
})
