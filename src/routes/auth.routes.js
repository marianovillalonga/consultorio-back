import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
    activateAccount,
    login,
    me,
    refresh,
    registerPatient,
    logout,
    resendActivation,
    forgotPassword,
    resetPassword
} from '../controllers/auth.controller.js'
import { authRequired } from '../middlewares/auth.js'

const router = Router()

const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
})

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos, intenta mas tarde' },
    keyGenerator: (req) => `${req.ip}:${String(req.body?.identifier || req.body?.email || '')}`
})

const resetLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos, intenta mas tarde' },
    keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '')}`
})

const refreshLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false
})

router.post('/register', authLimiter, registerPatient)
router.post('/login', loginLimiter, login)
router.get('/me', authRequired, me)
router.post('/refresh', refreshLimiter, refresh)
router.post('/logout', authRequired, logout)
router.get('/activate', activateAccount)
router.post('/resend-activation', resetLimiter, resendActivation)
router.post('/forgot-password', resetLimiter, forgotPassword)
router.post('/reset-password', resetLimiter, resetPassword)

export default router
