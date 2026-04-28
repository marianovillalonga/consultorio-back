import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeLogData } from '../../src/lib/logger.js'

test('sanitizeLogData redacted secretos en body y headers', () => {
    const sanitized = sanitizeLogData({
        password: 'super-secret',
        token: 'token-secret',
        refreshToken: 'refresh-secret',
        resetToken: 'reset-secret',
        authorization: 'Bearer secret',
        cookie: 'refreshToken=secret; accessToken=secret2',
        nested: {
            passwordHash: 'hash-secret',
            headers: {
                authorization: 'Bearer nested-secret'
            }
        }
    })

    assert.equal(sanitized.password, '[REDACTED]')
    assert.equal(sanitized.token, '[REDACTED]')
    assert.equal(sanitized.refreshToken, '[REDACTED]')
    assert.equal(sanitized.resetToken, '[REDACTED]')
    assert.equal(sanitized.authorization, '[REDACTED]')
    assert.equal(sanitized.cookie, '[REDACTED]')
    assert.equal(sanitized.nested.passwordHash, '[REDACTED]')
    assert.equal(sanitized.nested.headers.authorization, '[REDACTED]')
})
