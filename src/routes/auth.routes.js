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
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
})

router.post('/register', authLimiter, registerPatient)
router.post('/login', authLimiter, login)
router.get('/me', authRequired, me)
router.post('/refresh', refresh)
router.post('/logout', authRequired, logout)
router.get('/activate', activateAccount)
router.post('/resend-activation', authLimiter, resendActivation)
router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/reset-password', authLimiter, resetPassword)

export default router
