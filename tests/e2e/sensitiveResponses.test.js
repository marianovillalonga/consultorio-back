import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'
import { Appointment } from '../../src/models/index.js'
import {
    shouldRunE2E,
    connectDb,
    closeDb,
    createTestEmail,
    ensureUser,
    ensurePatient,
    ensureDentist,
    loginAndGetSession
} from '../helpers/e2e.js'

const walkSensitiveKeys = (value, forbiddenKeys, path = '', found = []) => {
    if (Array.isArray(value)) {
        value.forEach((item, index) => walkSensitiveKeys(item, forbiddenKeys, `${path}[${index}]`, found))
        return found
    }

    if (!value || typeof value !== 'object') return found

    for (const [key, nested] of Object.entries(value)) {
        const nextPath = path ? `${path}.${key}` : key
        if (forbiddenKeys.includes(key)) found.push(nextPath)
        walkSensitiveKeys(nested, forbiddenKeys, nextPath, found)
    }

    return found
}

const assertNoSensitiveKeys = (payload, forbiddenKeys) => {
    const found = walkSensitiveKeys(payload, forbiddenKeys)
    assert.deepEqual(found, [])
}

if (shouldRunE2E()) {
    before(async () => {
        await connectDb()
    })

    after(async () => {
        await closeDb()
    })

    test('dentists requiere auth y no expone datos internos', async () => {
        const anonymousRes = await request(app).get('/api/dentists')
        assert.equal(anonymousRes.status, 401)

        const password = 'Password123!'
        const admin = await ensureUser({
            email: createTestEmail('admin-sensitive-dentists'),
            password,
            role: 'ADMIN',
            clinicId: 1
        })
        const dentistUser = await ensureUser({
            email: createTestEmail('dentist-sensitive-dentists'),
            password,
            role: 'ODONTOLOGO',
            clinicId: 1
        })
        await ensureDentist({ userId: dentistUser.id, fullName: 'Odontologo Seguro' })

        const adminSession = await loginAndGetSession(app, { email: admin.email, password })
        assert.equal(adminSession.loginRes.status, 200)

        const res = await request(app)
            .get('/api/dentists')
            .set('Cookie', adminSession.cookieHeader)

        assert.equal(res.status, 200)
        assert.ok(Array.isArray(res.body?.dentists))
        assertNoSensitiveKeys(res.body, ['email', 'role', 'user', 'userId', 'passwordHash', 'tokenHash', 'resetToken', 'refreshToken'])
    })

    test('account profile de odontologo no expone campos sensibles', async () => {
        const password = 'Password123!'
        const dentistUser = await ensureUser({
            email: createTestEmail('dentist-profile-sensitive'),
            password,
            role: 'ODONTOLOGO',
            clinicId: 1
        })
        await ensureDentist({ userId: dentistUser.id, fullName: 'Perfil Seguro' })

        const session = await loginAndGetSession(app, { email: dentistUser.email, password })
        assert.equal(session.loginRes.status, 200)

        const res = await request(app)
            .get('/api/account/profile')
            .set('Cookie', session.cookieHeader)

        assert.equal(res.status, 200)
        assert.equal(res.body?.type, 'dentist')
        assertNoSensitiveKeys(res.body, ['email', 'role', 'user', 'userId', 'passwordHash', 'tokenHash', 'resetToken', 'refreshToken'])
    })

    test('admin users y appointments my no filtran datos internos', async () => {
        const password = 'Password123!'
        const admin = await ensureUser({
            email: createTestEmail('admin-sensitive-users'),
            password,
            role: 'ADMIN',
            clinicId: 1
        })
        const dentistUser = await ensureUser({
            email: createTestEmail('dentist-sensitive-users'),
            password,
            role: 'ODONTOLOGO',
            clinicId: 1
        })
        const dentist = await ensureDentist({ userId: dentistUser.id, fullName: 'Dentista Turno Seguro' })

        const patientUser = await ensureUser({
            email: createTestEmail('patient-sensitive-users'),
            password,
            role: 'PACIENTE',
            clinicId: 1
        })
        const patient = await ensurePatient({ fullName: 'Paciente Seguro', email: patientUser.email })

        const startAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
        const endAt = new Date(startAt.getTime() + 30 * 60 * 1000)
        await Appointment.create({
            dentistId: dentist.id,
            patientId: patient.id,
            startAt,
            endAt,
            status: 'CONFIRMADO',
            createdByRole: 'ADMIN'
        })

        const adminSession = await loginAndGetSession(app, { email: admin.email, password })
        assert.equal(adminSession.loginRes.status, 200)

        const usersRes = await request(app)
            .get('/api/admin/users')
            .set('Cookie', adminSession.cookieHeader)

        assert.equal(usersRes.status, 200)
        assert.ok(Array.isArray(usersRes.body?.users))
        assertNoSensitiveKeys(usersRes.body, ['role', 'passwordHash', 'tokenHash', 'resetToken', 'refreshToken'])

        const patientSession = await loginAndGetSession(app, { email: patientUser.email, password })
        assert.equal(patientSession.loginRes.status, 200)

        const appointmentsRes = await request(app)
            .get('/api/appointments/my')
            .set('Cookie', patientSession.cookieHeader)

        assert.equal(appointmentsRes.status, 200)
        assert.ok(Array.isArray(appointmentsRes.body?.appointments))
        assertNoSensitiveKeys(appointmentsRes.body, ['email', 'role', 'user', 'userId', 'passwordHash', 'tokenHash', 'resetToken', 'refreshToken'])
    })

    test('auth me no devuelve campos internos de sesion', async () => {
        const password = 'Password123!'
        const admin = await ensureUser({
            email: createTestEmail('admin-auth-me'),
            password,
            role: 'ADMIN',
            clinicId: 1
        })

        const session = await loginAndGetSession(app, { email: admin.email, password })
        assert.equal(session.loginRes.status, 200)

        const res = await request(app)
            .get('/api/auth/me')
            .set('Cookie', session.cookieHeader)

        assert.equal(res.status, 200)
        assert.deepEqual(Object.keys(res.body?.user || {}).sort(), ['email', 'id', 'role'])
        assertNoSensitiveKeys(res.body, ['clinicId', 'passwordHash', 'tokenHash', 'resetToken', 'refreshToken'])
    })
} else {
    test('dentists requiere auth y no expone datos internos', { skip: true }, () => {})
    test('account profile de odontologo no expone campos sensibles', { skip: true }, () => {})
    test('admin users y appointments my no filtran datos internos', { skip: true }, () => {})
    test('auth me no devuelve campos internos de sesion', { skip: true }, () => {})
}
