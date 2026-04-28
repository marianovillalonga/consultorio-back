import { Router } from 'express'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'
import { createUser, listUsers, updateUser } from '../controllers/adminUsers.controller.js'
import { listUserPermissions, listViews, updateUserPermissions } from '../controllers/permissions.controller.js'

const router = Router()

router.use(authRequired, requireClinicScope, requireRole('ADMIN'))

router.get('/', listUsers)
router.post('/', createUser)
router.patch('/:id', updateUser)
router.get('/views', listViews)
router.get('/:id/permissions', listUserPermissions)
router.put('/:id/permissions', updateUserPermissions)

export default router
