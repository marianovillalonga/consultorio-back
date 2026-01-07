import { User } from './User.js'
import { Patient } from './Patient.js'
import { Dentist } from './Dentist.js'
import { Availability } from './Availability.js'
import { Block } from './Block.js'
import { Appointment } from './Appointment.js'
import { ObraSocial } from './ObraSocial.js'
import { UserPermission } from './UserPermission.js'
import { RefreshToken } from './RefreshToken.js'
import { AuditLog } from './AuditLog.js'
import { ActivationToken } from './ActivationToken.js'

Dentist.belongsTo(User, { foreignKey: 'userId' })
Availability.belongsTo(Dentist, { foreignKey: 'dentistId' })
Block.belongsTo(Dentist, { foreignKey: 'dentistId' })

Appointment.belongsTo(Dentist, { foreignKey: 'dentistId' })
Appointment.belongsTo(Patient, { foreignKey: 'patientId' })

UserPermission.belongsTo(User, { foreignKey: 'userId' })
RefreshToken.belongsTo(User, { foreignKey: 'userId' })
AuditLog.belongsTo(User, { foreignKey: 'userId' })
ActivationToken.belongsTo(User, { foreignKey: 'userId' })

export { User, Patient, Dentist, Availability, Block, Appointment, ObraSocial, UserPermission, RefreshToken, AuditLog, ActivationToken }
