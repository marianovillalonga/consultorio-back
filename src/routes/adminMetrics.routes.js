import { Router } from 'express'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'
import { adminMetrics } from '../controllers/adminMetrics.controller.js'

const router = Router()

router.get('/', authRequired, requireClinicScope, requireRole('ADMIN'), adminMetrics)

export default router
