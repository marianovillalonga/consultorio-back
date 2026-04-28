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
    loginAndGetSession
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

        const session = await loginAndGetSession(app, { email, password })
        const loginRes = session.loginRes

        assert.equal(loginRes.status, 200)
        assert.ok(session.csrfToken)
        assert.ok(session.cookieHeader)

        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', session.cookieHeader)
            .set('X-CSRF-Token', session.csrfToken)
        assert.equal(refreshRes.status, 200)
        const refreshCsrf = refreshRes.headers['x-csrf-token']
        assert.ok(refreshCsrf)
    })
} else {
    test('login + refresh devuelve tokens', { skip: true }, () => {})
}
