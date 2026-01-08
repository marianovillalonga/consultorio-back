import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const ResetToken = sequelize.define('ResetToken', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    tokenHash: { type: DataTypes.STRING(255), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'reset_tokens',
    timestamps: true
})
