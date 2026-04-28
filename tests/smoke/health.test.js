import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

const loadApp = async () => {
    process.env.NODE_ENV = 'test'
    const { default: app } = await import(`../../src/app.js?ts=${Date.now()}`)
    return app
}

test('health responde OK', async () => {
    const app = await loadApp()
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.equal(res.body?.status, 'OK')
})

test('error 500 devuelve mensaje generico con requestId', async () => {
    const app = await loadApp()
    const res = await request(app).get('/_test/error')
    assert.equal(res.status, 500)
    assert.equal(res.body?.message, 'Error interno del servidor')
    assert.equal(typeof res.body?.requestId, 'string')
    assert.ok(res.body.requestId.length > 0)
    assert.notEqual(res.body?.message, 'Exploto internamente en test')
})
