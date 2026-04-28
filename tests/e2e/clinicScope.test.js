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
    loginAndGetSession
} from '../helpers/e2e.js'

if (shouldRunE2E()) {
    before(async () => {
        await connectDb()
    })

    after(async () => {
        await closeDb()
    })

    test('admin de otra clinica no puede leer pacientes ajenos', async () => {
        const password = 'Password123!'
        const adminClinic1 = await ensureUser({
            email: createTestEmail('admin-clinic-1'),
            password,
            role: 'ADMIN',
            clinicId: 1
        })
        const adminClinic2 = await ensureUser({
            email: createTestEmail('admin-clinic-2'),
            password,
            role: 'ADMIN',
            clinicId: 2
        })

        const clinic1Session = await loginAndGetSession(app, {
            email: adminClinic1.email,
            password
        })
        assert.equal(clinic1Session.loginRes.status, 200)

        const createPatientRes = await request(app)
            .post('/api/patients')
            .set('Cookie', clinic1Session.cookieHeader)
            .set('X-CSRF-Token', clinic1Session.csrfToken)
            .send({
                fullName: 'Paciente Clinica 1',
                email: createTestEmail('patient-clinic-1')
            })

        assert.equal(createPatientRes.status, 201)
        const patientId = createPatientRes.body?.patient?.id
        assert.ok(patientId)

        const clinic2Session = await loginAndGetSession(app, {
            email: adminClinic2.email,
            password
        })
        assert.equal(clinic2Session.loginRes.status, 200)

        const forbiddenReadRes = await request(app)
            .get(`/api/patients/${patientId}`)
            .set('Cookie', clinic2Session.cookieHeader)

        assert.equal(forbiddenReadRes.status, 404)
        assert.equal(forbiddenReadRes.body?.message, 'Paciente no encontrado')
    })
} else {
    test('admin de otra clinica no puede leer pacientes ajenos', { skip: true }, () => {})
}
