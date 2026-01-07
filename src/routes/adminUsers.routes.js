import { Router } from 'express'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { createUser, listUsers, updateUser } from '../controllers/adminUsers.controller.js'
import { listUserPermissions, listViews, updateUserPermissions } from '../controllers/permissions.controller.js'

const router = Router()

router.get('/', authRequired, requireRole('ADMIN'), listUsers)
router.post('/', authRequired, requireRole('ADMIN'), createUser)
router.patch('/:id', authRequired, requireRole('ADMIN'), updateUser)
router.get('/views', authRequired, requireRole('ADMIN'), listViews)
router.get('/:id/permissions', authRequired, requireRole('ADMIN'), listUserPermissions)
router.put('/:id/permissions', authRequired, requireRole('ADMIN'), updateUserPermissions)

export default router
