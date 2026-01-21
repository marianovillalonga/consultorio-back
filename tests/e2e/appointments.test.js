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
    ensureDentist
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

        const agent = request.agent(app)
        const loginRes = await agent
            .post('/api/auth/login')
            .send({ email: patientEmail, password })
            .set('Content-Type', 'application/json')

        assert.equal(loginRes.status, 200)
        const csrf = loginRes.headers['x-csrf-token']
        assert.ok(csrf)

        const dateISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)

        const availabilityRes = await agent
            .get(`/api/appointments/availability?dentistId=${dentist.id}&date=${dateISO}`)

        assert.equal(availabilityRes.status, 200)

        const startAt = new Date(`${dateISO}T10:00:00.000Z`)
        const endAt = new Date(`${dateISO}T10:30:00.000Z`)

        const createRes = await agent
            .post('/api/appointments')
            .set('X-CSRF-Token', csrf)
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
} else {
    test('crear turno y listar disponibilidad', { skip: true }, () => {})
}
