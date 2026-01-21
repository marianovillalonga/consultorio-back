import { sequelize } from '../../src/db/sequelize.js'
import { User, Patient, Dentist } from '../../src/models/index.js'
import { hashPassword } from '../../src/services/auth.service.js'

export const shouldRunE2E = () => process.env.TEST_E2E === 'true'

export const connectDb = async () => {
    await sequelize.authenticate()
}

export const closeDb = async () => {
    await sequelize.close()
}

export const createTestEmail = (prefix = 'e2e') => {
    const stamp = Date.now()
    return `${prefix}.${stamp}@example.com`
}

export const ensureUser = async ({ email, password, role }) => {
    const passwordHash = await hashPassword(password)
    const [user, created] = await User.findOrCreate({
        where: { email },
        defaults: { email, passwordHash, role, activeStatus: true, active: true }
    })
    if (!created) {
        await user.update({ passwordHash, role, activeStatus: true, active: true })
    }
    return user
}

export const ensurePatient = async ({ fullName, email }) => {
    const [patient] = await Patient.findOrCreate({
        where: { email },
        defaults: { fullName, email }
    })
    return patient
}

export const ensureDentist = async ({ userId, fullName }) => {
    const [dentist] = await Dentist.findOrCreate({
        where: { userId },
        defaults: {
            userId,
            fullName,
            specialties: JSON.stringify([]),
            license: 'E2E-0001',
            specialty: 'General'
        }
    })
    return dentist
}
