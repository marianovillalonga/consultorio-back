import { Router } from 'express'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'
import { paymentsReport } from '../controllers/reports.controller.js'

const router = Router()

router.get(
    '/payments',
    authRequired,
    requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'),
    requireViewPermission('PACIENTES', 'read'),
    paymentsReport
)

export default router
