import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'
import {
    shouldRunE2E,
    connectDb,
    closeDb,
    createTestEmail,
    ensureUser
} from '../helpers/e2e.js'

if (shouldRunE2E()) {
    before(async () => {
        await connectDb()
    })

    after(async () => {
        await closeDb()
    })

    test('crear y listar pacientes', async () => {
        const adminEmail = createTestEmail('admin')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const agent = request.agent(app)
        const loginRes = await agent
            .post('/api/auth/login')
            .send({ email: adminEmail, password })
            .set('Content-Type', 'application/json')

        assert.equal(loginRes.status, 200)
        const csrf = loginRes.headers['x-csrf-token']
        assert.ok(csrf)

        const patientEmail = createTestEmail('patient')
        const createRes = await agent
            .post('/api/patients')
            .set('X-CSRF-Token', csrf)
            .send({ fullName: 'Paciente E2E', email: patientEmail })

        assert.equal(createRes.status, 201)
        assert.ok(createRes.body?.patient?.id)

        const listRes = await agent.get('/api/patients')
        assert.equal(listRes.status, 200)
        assert.ok(Array.isArray(listRes.body?.patients))
    })
} else {
    test('crear y listar pacientes', { skip: true }, () => {})
}
