import { Router } from 'express'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'
import { listAvailability, upsertAvailability, deleteAvailability } from '../controllers/availability.controller.js'

const router = Router()

router.use(authRequired, requireClinicScope, requireRole('ADMIN', 'ODONTOLOGO'))

router.get('/:dentistId', listAvailability)
router.post('/:dentistId', upsertAvailability)
router.delete('/:dentistId/:id', deleteAvailability)

export default router
