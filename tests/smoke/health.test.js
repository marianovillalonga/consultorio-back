import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'

test('health responde OK', async () => {
    const res = await request(app).get('/health')
    assert.equal(res.status, 200)
    assert.equal(res.body?.status, 'OK')
})

test('docs json disponible', async () => {
    const res = await request(app).get('/api/docs.json')
    assert.equal(res.status, 200)
    assert.equal(res.body?.openapi, '3.0.3')
})
