import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const Availability = sequelize.define('Availability', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    dentistId: { type: DataTypes.INTEGER, allowNull: false },
    weekday: { type: DataTypes.INTEGER, allowNull: false }, 
    fromTime: { type: DataTypes.STRING(5), allowNull: false }, 
    toTime: { type: DataTypes.STRING(5), allowNull: false },  
    slotMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 }
}, {
    tableName: 'availabilities',
    timestamps: true
})
