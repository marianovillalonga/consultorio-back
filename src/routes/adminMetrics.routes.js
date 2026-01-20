import { Router } from 'express'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { adminMetrics } from '../controllers/adminMetrics.controller.js'

const router = Router()

router.get('/', authRequired, requireRole('ADMIN'), adminMetrics)

export default router
