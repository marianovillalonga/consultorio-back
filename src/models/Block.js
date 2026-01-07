import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const Block = sequelize.define('Block', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    dentistId: { type: DataTypes.INTEGER, allowNull: false },
    fromDateTime: { type: DataTypes.DATE, allowNull: false },
    toDateTime: { type: DataTypes.DATE, allowNull: false },
    reason: { type: DataTypes.STRING(200), allowNull: true }
}, {
    tableName: 'blocks',
    timestamps: true
})
