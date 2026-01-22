import { DataTypes } from 'sequelize'
import { sequelize } from '../db/sequelize.js'

export const Implant = sequelize.define(
  'Implant',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    patientId: { type: DataTypes.INTEGER, allowNull: false },
    piece: { type: DataTypes.STRING(10), allowNull: false },
    maxillary: { type: DataTypes.ENUM('SUP', 'INF'), allowNull: true },
    status: {
      type: DataTypes.ENUM(
        'PLANIFICADO',
        'COLOCADO',
        'OSTEOINTEGRACION',
        'PROTESIS',
        'CONTROL',
        'FALLIDO',
        'RETIRADO'
      ),
      allowNull: false,
      defaultValue: 'PLANIFICADO'
    },
    implantType: { type: DataTypes.STRING(120), allowNull: true },
    length: { type: DataTypes.STRING(40), allowNull: true },
    diameter: { type: DataTypes.STRING(40), allowNull: true },
    brand: { type: DataTypes.STRING(120), allowNull: true },
    model: { type: DataTypes.STRING(120), allowNull: true },
    technique: { type: DataTypes.ENUM('CONVENCIONAL', 'GUIADA'), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    responsibleUserId: { type: DataTypes.INTEGER, allowNull: true },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
    updatedByUserId: { type: DataTypes.INTEGER, allowNull: true },
    planning: { type: DataTypes.JSON, allowNull: true },
    surgery: { type: DataTypes.JSON, allowNull: true },
    osteointegration: { type: DataTypes.JSON, allowNull: true },
    prosthesis: { type: DataTypes.JSON, allowNull: true },
    followups: { type: DataTypes.JSON, allowNull: true }
  },
  {
    tableName: 'implants',
    timestamps: true
  }
)
