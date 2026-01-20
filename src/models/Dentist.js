import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const Dentist = sequelize.define('Dentist', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    fullName: { type: DataTypes.STRING(150), allowNull: true },
    photoUrl: { type: DataTypes.STRING(255), allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    specialties: { type: DataTypes.TEXT, allowNull: true },
    license: { type: DataTypes.STRING(80), allowNull: true },
    specialty: { type: DataTypes.STRING(120), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    tableName: 'dentists',
    timestamps: true
})
