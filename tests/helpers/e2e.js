import { sequelize } from '../../src/db/sequelize.js'
import { User, Patient, Dentist } from '../../src/models/index.js'
import { hashPassword } from '../../src/services/auth.service.js'
import request from 'supertest'

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

export const ensureUser = async ({ email, password, role, clinicId = 1 }) => {
    const passwordHash = await hashPassword(password)
    const [user, created] = await User.findOrCreate({
        where: { email },
        defaults: { email, passwordHash, role, clinicId, activeStatus: true, active: true }
    })
    if (!created) {
        await user.update({ passwordHash, role, clinicId, activeStatus: true, active: true })
    }
    return user
}

export const ensurePatient = async ({ fullName, email, clinicId = 1 }) => {
    const [patient] = await Patient.findOrCreate({
        where: { email },
        defaults: { fullName, email, clinicId }
    })
    await patient.update({ fullName, email, clinicId })
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

const toCookieHeader = (setCookie = []) =>
    setCookie
        .map((cookie) => String(cookie).split(';')[0])
        .join('; ')

export const loginAndGetSession = async (app, { email, password }) => {
    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .set('Content-Type', 'application/json')

    return {
        loginRes,
        csrfToken: loginRes.headers['x-csrf-token'] || '',
        cookieHeader: toCookieHeader(loginRes.headers['set-cookie'] || [])
    }
}
