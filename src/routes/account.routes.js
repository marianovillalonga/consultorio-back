import { Router } from 'express'
import { getPermissions, getProfile, updateProfile } from '../controllers/account.controller.js'
import { authRequired } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'

const router = Router()

router.use(authRequired, requireClinicScope)

router.get('/profile', getProfile)
router.get('/permissions', getPermissions)
router.patch('/profile', updateProfile)

export default router
