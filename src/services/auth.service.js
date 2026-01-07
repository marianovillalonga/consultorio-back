import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ActivationToken, RefreshToken, User } from '../models/index.js'

export const hashPassword = async (plain) => bcrypt.hash(plain, 10)
export const verifyPassword = async (plain, hash) => bcrypt.compare(plain, hash)

export const signToken = (user) => {
    return jwt.sign(
        { sub: String(user.id), role: user.role, email: user.email },
        env.jwt.secret,
        { expiresIn: env.jwt.expiresIn }
    )
}

export const signRefreshToken = (user) => {
    return jwt.sign(
        { sub: String(user.id), role: user.role, email: user.email },
        env.refresh.secret,
        { expiresIn: env.refresh.expiresIn }
    )
}

export const getUserByEmail = async (email) => {
    return User.findOne({ where: { email } })
}

export const validatePasswordStrength = (plain) => {
    if (!plain || plain.length < 8) return false
    const hasUpper = /[A-Z]/.test(plain)
    const hasLower = /[a-z]/.test(plain)
    const hasNumber = /[0-9]/.test(plain)
    const hasSymbol = /[^A-Za-z0-9]/.test(plain)
    return hasUpper && hasLower && hasNumber && hasSymbol
}

export const hashRefreshToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export const generateCsrfToken = () => {
    return crypto.randomBytes(24).toString('hex')
}

export const hashActivationToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export const saveActivationToken = async ({ userId, token, expiresAt }) => {
    const tokenHash = hashActivationToken(token)
    return ActivationToken.create({ userId, tokenHash, expiresAt })
}

export const verifyActivationToken = async (token) => {
    const tokenHash = hashActivationToken(token)
    const row = await ActivationToken.findOne({ where: { tokenHash, usedAt: null } })
    if (!row) return null
    if (row.expiresAt < new Date()) return null
    return row
}

export const saveRefreshToken = async ({ userId, token, expiresAt }) => {
    const tokenHash = hashRefreshToken(token)
    return RefreshToken.create({ userId, tokenHash, expiresAt })
}

export const revokeRefreshToken = async (token) => {
    const tokenHash = hashRefreshToken(token)
    const row = await RefreshToken.findOne({ where: { tokenHash, revokedAt: null } })
    if (!row) return false
    await row.update({ revokedAt: new Date() })
    return true
}

export const verifyRefreshToken = async (token) => {
    const tokenHash = hashRefreshToken(token)
    const row = await RefreshToken.findOne({ where: { tokenHash, revokedAt: null } })
    if (!row) return null
    if (row.expiresAt < new Date()) {
        await row.update({ revokedAt: new Date() })
        return null
    }
    return row
}
