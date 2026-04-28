import { Router } from 'express'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'
import { paymentsReport } from '../controllers/reports.controller.js'

const router = Router()

router.get(
    '/payments',
    authRequired,
    requireClinicScope,
    requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'),
    requireViewPermission('PAGOS', 'read'),
    paymentsReport
)

export default router
