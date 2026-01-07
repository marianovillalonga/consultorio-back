import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const ActivationToken = sequelize.define('ActivationToken', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    tokenHash: { type: DataTypes.STRING(255), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'activation_tokens',
    timestamps: true
})
