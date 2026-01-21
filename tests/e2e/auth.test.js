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
    ensurePatient
} from '../helpers/e2e.js'

if (shouldRunE2E()) {
    before(async () => {
        await connectDb()
    })

    after(async () => {
        await closeDb()
    })

    test('login + refresh devuelve tokens', async () => {
        const email = createTestEmail('auth')
        const password = 'Password123!'
        await ensureUser({ email, password, role: 'PACIENTE' })
        await ensurePatient({ fullName: 'Paciente E2E', email })

        const agent = request.agent(app)
        const loginRes = await agent
            .post('/api/auth/login')
            .send({ email, password })
            .set('Content-Type', 'application/json')

        assert.equal(loginRes.status, 200)
        const csrf = loginRes.headers['x-csrf-token']
        assert.ok(csrf)

        const refreshRes = await agent.post('/api/auth/refresh')
        assert.equal(refreshRes.status, 200)
        const refreshCsrf = refreshRes.headers['x-csrf-token']
        assert.ok(refreshCsrf)
    })
} else {
    test('login + refresh devuelve tokens', { skip: true }, () => {})
}
