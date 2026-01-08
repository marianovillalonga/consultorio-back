import { z } from 'zod'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User, Patient } from '../models/index.js'
import { env } from '../config/env.js'
import {
    getUserByEmail,
    hashPassword,
    signToken,
    signRefreshToken,
    verifyPassword,
    validatePasswordStrength,
    saveRefreshToken,
    verifyRefreshToken,
    revokeRefreshToken,
    saveActivationToken,
    verifyActivationToken,
    generateCsrfToken,
    saveResetToken,
    verifyResetToken,
    revokeRefreshTokensByUserId
} from '../services/auth.service.js'
import { logAudit } from '../services/audit.service.js'
import { sendActivationEmail, sendPasswordResetEmail } from '../services/mail.service.js'

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2)
})

const isProd = process.env.NODE_ENV === 'production'
const cookieSecure = env.cookie.secure || isProd
const cookieSameSite = cookieSecure ? 'none' : 'lax'

const cookieOptions = {
    httpOnly: true,
    sameSite: cookieSameSite,
    secure: cookieSecure,
    domain: env.cookie.domain
}

const setAuthCookies = (res, token, refreshToken) => {
    const csrfToken = generateCsrfToken()
    res.cookie('accessToken', token, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.cookie('csrfToken', csrfToken, {
        httpOnly: false,
        sameSite: cookieSameSite,
        secure: cookieSecure,
        domain: env.cookie.domain,
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
    res.set('X-CSRF-Token', csrfToken)
    return csrfToken
}

export const registerPatient = async (req, res) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    }
    const data = parsed.data
    if (!validatePasswordStrength(data.password)) {
        return res.status(400).json({ message: 'La contraseña es debil' })
    }

    const exists = await getUserByEmail(data.email)
    if (exists) return res.status(409).json({ message: 'Email ya registrado' })

    const passwordHash = await hashPassword(data.password)

    const user = await User.create({ email: data.email, passwordHash, role: 'PACIENTE', activeStatus: false })
    const patient = await Patient.create({ fullName: data.fullName, email: data.email })
    const activationToken = crypto.randomBytes(32).toString('hex')
    const activationExpires = new Date(Date.now() + env.activation.expiresMinutes * 60 * 1000)
    await saveActivationToken({ userId: user.id, token: activationToken, expiresAt: activationExpires })
    if (env.app.frontUrl) {
        const link = `${env.app.frontUrl}/activar?token=${activationToken}`
        await sendActivationEmail({ to: user.email, link })
    }
    await logAudit({ userId: user.id, action: 'REGISTER', details: { email: user.email } })
    res.status(201).json({ user: { id: user.id, role: user.role, email: user.email }, patient })
}

const loginSchema = z.object({
    identifier: z.string().min(3).optional(), // email o dni
    email: z.string().email().optional(),
    password: z.string().min(1)
})

const forgotSchema = z.object({
    email: z.string().email()
})

const resetSchema = z.object({
    token: z.string().min(10),
    password: z.string().min(8)
})

export const login = async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    }
    const data = parsed.data
    const identifier = data.identifier || data.email
    if (!identifier) return res.status(400).json({ message: 'Debes enviar email o documento' })

    let user = null
    if (identifier.includes('@')) {
        user = await getUserByEmail(identifier)
    } else {
        // buscar patient por dni y usar su email
        const patient = await Patient.findOne({ where: { dni: identifier } })
        if (patient?.email) {
            user = await getUserByEmail(patient.email)
        }
    }

    if (!user || !user.active) return res.status(401).json({ message: 'Credenciales invalidas' })
    if (!user.activeStatus) return res.status(403).json({ message: 'Cuenta pendiente de activacion' })

    const ok = await verifyPassword(data.password, user.passwordHash)
    if (!ok) {
        await logAudit({ userId: user.id, action: 'LOGIN_FAILED', details: { email: user.email } })
        return res.status(401).json({ message: 'Credenciales invalidas' })
    }

    const token = signToken(user)
    const refreshToken = signRefreshToken(user)
    const refreshPayload = jwt.decode(refreshToken)
    await saveRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(refreshPayload.exp * 1000)
    })
    const csrfToken = setAuthCookies(res, token, refreshToken)
    await logAudit({ userId: user.id, action: 'LOGIN', details: { email: user.email } })
    res.json({ user: { id: user.id, role: user.role, email: user.email }, csrfToken })
}

export const me = async (req, res) => {
    res.json({ user: req.user })
}

export const refresh = async (req, res) => {
    const token = req.cookies?.refreshToken
    if (!token) return res.status(401).json({ message: 'Refresh requerido' })

    const stored = await verifyRefreshToken(token)
    if (!stored) return res.status(401).json({ message: 'Refresh invalido' })

    let payload = null
    try {
        payload = jwt.verify(token, env.refresh.secret)
    } catch {
        await revokeRefreshToken(token)
        return res.status(401).json({ message: 'Refresh invalido' })
    }

    const user = await User.findByPk(payload.sub)
    if (!user || !user.active || !user.activeStatus) return res.status(401).json({ message: 'Usuario invalido' })

    const nextAccess = signToken(user)
    const nextRefresh = signRefreshToken(user)
    const refreshPayload = jwt.decode(nextRefresh)
    await saveRefreshToken({
        userId: user.id,
        token: nextRefresh,
        expiresAt: new Date(refreshPayload.exp * 1000)
    })
    await revokeRefreshToken(token)
    const csrfToken = setAuthCookies(res, nextAccess, nextRefresh)
    res.json({ user: { id: user.id, role: user.role, email: user.email }, csrfToken })
}

export const logout = async (req, res) => {
    const token = req.cookies?.refreshToken
    if (token) await revokeRefreshToken(token)
    res.clearCookie('accessToken', cookieOptions)
    res.clearCookie('refreshToken', cookieOptions)
    res.clearCookie('csrfToken', { ...cookieOptions, httpOnly: false })
    res.json({ ok: true })
}

export const activateAccount = async (req, res) => {
    const token = req.query.token || req.body?.token
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Token requerido' })
    }

    const row = await verifyActivationToken(token)
    if (!row) return res.status(400).json({ message: 'Token invalido' })

    const user = await User.findByPk(row.userId)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    await user.update({ activeStatus: true })
    await row.update({ usedAt: new Date() })
    await logAudit({ userId: user.id, action: 'ACCOUNT_ACTIVATED', details: { email: user.email } })
    res.json({ ok: true })
}

export const resendActivation = async (req, res) => {
    const email = req.body?.email
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email requerido' })
    }
    const user = await getUserByEmail(email)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    if (user.activeStatus) return res.status(400).json({ message: 'La cuenta ya esta activa' })

    const activationToken = crypto.randomBytes(32).toString('hex')
    const activationExpires = new Date(Date.now() + env.activation.expiresMinutes * 60 * 1000)
    await saveActivationToken({ userId: user.id, token: activationToken, expiresAt: activationExpires })

    if (env.app.frontUrl) {
        const link = `${env.app.frontUrl}/activar?token=${activationToken}`
        await sendActivationEmail({ to: user.email, link })
    }

    await logAudit({ userId: user.id, action: 'RESEND_ACTIVATION', details: { email: user.email } })
    res.json({ ok: true })
}

export const forgotPassword = async (req, res) => {
    const parsed = forgotSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    }

    const { email } = parsed.data
    const user = await getUserByEmail(email)
    if (user && env.app.frontUrl) {
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetExpires = new Date(Date.now() + env.reset.expiresMinutes * 60 * 1000)
        await saveResetToken({ userId: user.id, token: resetToken, expiresAt: resetExpires })
        const link = `${env.app.frontUrl}/reset?token=${resetToken}`
        await sendPasswordResetEmail({ to: user.email, link })
        await logAudit({ userId: user.id, action: 'PASSWORD_RESET_REQUEST', details: { email: user.email } })
    }

    res.json({ ok: true })
}

export const resetPassword = async (req, res) => {
    const parsed = resetSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    }

    const { token, password } = parsed.data
    if (!validatePasswordStrength(password)) {
        return res.status(400).json({ message: 'La contrasena es debil' })
    }

    const row = await verifyResetToken(token)
    if (!row) return res.status(400).json({ message: 'Token invalido' })

    const user = await User.findByPk(row.userId)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    const passwordHash = await hashPassword(password)
    await user.update({ passwordHash })
    await row.update({ usedAt: new Date() })
    await revokeRefreshTokensByUserId(user.id)
    await logAudit({ userId: user.id, action: 'PASSWORD_RESET', details: { email: user.email } })

    res.json({ ok: true })
}



