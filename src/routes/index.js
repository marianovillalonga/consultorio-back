import { Router } from 'express'
import authRoutes from './auth.routes.js'
import appointmentsRoutes from './appointments.routes.js'
import accountRoutes from './account.routes.js'
import dentistsRoutes from './dentists.routes.js'
import availabilityRoutes from './availability.routes.js'
import blocksRoutes from './blocks.routes.js'
import patientsRoutes from './patients.routes.js'
import obrasRoutes from './obrasSociales.routes.js'
import adminUsersRoutes from './adminUsers.routes.js'
import reportsRoutes from './reports.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/appointments', appointmentsRoutes)
router.use('/account', accountRoutes)
router.use('/dentists', dentistsRoutes)
router.use('/availability', availabilityRoutes)
router.use('/blocks', blocksRoutes)
router.use('/patients', patientsRoutes)
router.use('/obras-sociales', obrasRoutes)
router.use('/admin/users', adminUsersRoutes)
router.use('/reports', reportsRoutes)

export default router
