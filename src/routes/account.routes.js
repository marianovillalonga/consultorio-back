import { Router } from 'express'
import { getPermissions, getProfile, updateProfile } from '../controllers/account.controller.js'
import { authRequired } from '../middlewares/auth.js'

const router = Router()

router.get('/profile', authRequired, getProfile)
router.get('/permissions', authRequired, getPermissions)
router.patch('/profile', authRequired, updateProfile)

export default router
