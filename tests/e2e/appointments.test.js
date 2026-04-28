import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'
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

if (shouldRunE2E()) {
    before(async () => {
        await connectDb()
    })

    after(async () => {
        await closeDb()
    })

    test('crear turno y listar disponibilidad', async () => {
        const dentistEmail = createTestEmail('dentist')
        const patientEmail = createTestEmail('patient')
        const password = 'Password123!'

        const dentistUser = await ensureUser({ email: dentistEmail, password, role: 'ODONTOLOGO' })
        const dentist = await ensureDentist({ userId: dentistUser.id, fullName: 'Odontologo E2E' })

        await ensureUser({ email: patientEmail, password, role: 'PACIENTE' })
        const patient = await ensurePatient({ fullName: 'Paciente E2E', email: patientEmail })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: patientEmail,
            password
        })

        assert.equal(loginRes.status, 200)
        assert.ok(csrfToken)
        assert.ok(cookieHeader)

        const dateISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)

        const availabilityRes = await request(app)
            .get(`/api/appointments/availability?dentistId=${dentist.id}&date=${dateISO}`)
            .set('Cookie', cookieHeader)

        assert.equal(availabilityRes.status, 200)

        const startAt = new Date(`${dateISO}T10:00:00.000Z`)
        const endAt = new Date(`${dateISO}T10:30:00.000Z`)

        const createRes = await request(app)
            .post('/api/appointments')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                dentistId: dentist.id,
                patientId: patient.id,
                startAt: startAt.toISOString(),
                endAt: endAt.toISOString(),
                reason: 'Control E2E'
            })

        assert.equal(createRes.status, 201)
        assert.ok(createRes.body?.appointment?.id)
    })

    test('dos reservas concurrentes del mismo slot devuelven 201 y 409', async () => {
        const dentistEmail = createTestEmail('dentist-concurrent')
        const patientEmail = createTestEmail('patient-concurrent')
        const password = 'Password123!'

        const dentistUser = await ensureUser({ email: dentistEmail, password, role: 'ODONTOLOGO' })
        const dentist = await ensureDentist({ userId: dentistUser.id, fullName: 'Odontologo E2E Concurrente' })

        await ensureUser({ email: patientEmail, password, role: 'PACIENTE' })
        const patient = await ensurePatient({ fullName: 'Paciente E2E Concurrente', email: patientEmail })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: patientEmail,
            password
        })

        assert.equal(loginRes.status, 200)
        assert.ok(csrfToken)
        assert.ok(cookieHeader)

        const dateISO = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)

        const startAt = new Date(`${dateISO}T11:00:00.000Z`)
        const endAt = new Date(`${dateISO}T11:30:00.000Z`)
        const payload = {
            dentistId: dentist.id,
            patientId: patient.id,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            reason: 'Control concurrente E2E'
        }

        const [firstRes, secondRes] = await Promise.all([
            request(app).post('/api/appointments').set('Cookie', cookieHeader).set('X-CSRF-Token', csrfToken).send(payload),
            request(app).post('/api/appointments').set('Cookie', cookieHeader).set('X-CSRF-Token', csrfToken).send(payload)
        ])

        const statuses = [firstRes.status, secondRes.status].sort((a, b) => a - b)
        assert.deepEqual(statuses, [201, 409])

        const successRes = firstRes.status === 201 ? firstRes : secondRes
        const conflictRes = firstRes.status === 409 ? firstRes : secondRes

        assert.ok(successRes.body?.appointment?.id)
        assert.equal(conflictRes.body?.message, 'Turno ya ocupado')
    })
} else {
    test('crear turno y listar disponibilidad', { skip: true }, () => {})
    test('dos reservas concurrentes del mismo slot devuelven 201 y 409', { skip: true }, () => {})
}
