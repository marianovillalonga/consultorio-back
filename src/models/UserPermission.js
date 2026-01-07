import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const UserPermission = sequelize.define('UserPermission', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    viewKey: { type: DataTypes.STRING(60), allowNull: false },
    canRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    canWrite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'user_permissions',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['userId', 'viewKey'] }
    ]
})
