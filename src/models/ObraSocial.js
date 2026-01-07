import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const ObraSocial = sequelize.define('ObraSocial', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    numeroObraSocial: { type: DataTypes.STRING(50), allowNull: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    telefono: { type: DataTypes.STRING(50), allowNull: true },
    email: { type: DataTypes.STRING(120), allowNull: true },
    notas: { type: DataTypes.TEXT, allowNull: true },
    aranceles: { type: DataTypes.JSON, allowNull: true },
    normasTrabajoFileName: { type: DataTypes.STRING(200), allowNull: true },
    normasTrabajoFileData: { type: DataTypes.TEXT, allowNull: true },
    normasFacturacionFileName: { type: DataTypes.STRING(200), allowNull: true },
    normasFacturacionFileData: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'obras_sociales',
    timestamps: true
})
