import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { resetLoggerSink, setLoggerSink } from '../../src/lib/logger.js'

let entries = []

const loadApp = async () => {
    process.env.NODE_ENV = 'test'
    const { default: app } = await import(`../../src/app.js?ts=${Date.now()}`)
    return app
}

beforeEach(() => {
    entries = []
    setLoggerSink((entry) => {
        entries.push(entry)
    })
})

afterEach(() => {
    resetLoggerSink()
})

test('health responde con requestId', async () => {
    const app = await loadApp()
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.ok(res.headers['x-request-id'])
})

test('errores internos devuelven respuesta controlada con requestId', async () => {
    const app = await loadApp()
    const res = await request(app).get('/_test/error')
    assert.equal(res.status, 500)
    assert.equal(res.body?.message, 'Error interno del servidor')
    assert.ok(res.body?.requestId)
})

test('http logger no registra authorization ni cookies', async () => {
    const app = await loadApp()
    const res = await request(app)
        .get('/health')
        .set('Authorization', 'Bearer secret-token')
        .set('Cookie', ['refreshToken=secret-refresh', 'accessToken=secret-access'])

    assert.equal(res.status, 200)
    const serialized = JSON.stringify(entries)
    assert.ok(entries.some((entry) => entry.message === 'http_request'))
    assert.ok(serialized.includes('[REDACTED]'))
    assert.equal(serialized.includes('secret-token'), false)
    assert.equal(serialized.includes('secret-refresh'), false)
    assert.equal(serialized.includes('secret-access'), false)
})
