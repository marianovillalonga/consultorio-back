import { Router } from 'express'
import { getProfile, updateProfile } from '../controllers/account.controller.js'
import { authRequired } from '../middlewares/auth.js'

const router = Router()

router.get('/profile', authRequired, getProfile)
router.patch('/profile', authRequired, updateProfile)

export default router
