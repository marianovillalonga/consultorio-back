import { Router } from 'express'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { listAvailability, upsertAvailability, deleteAvailability } from '../controllers/availability.controller.js'

const router = Router()

router.get('/:dentistId', authRequired, requireRole('ADMIN', 'ODONTOLOGO'), listAvailability)
router.post('/:dentistId', authRequired, requireRole('ADMIN', 'ODONTOLOGO'), upsertAvailability)
router.delete('/:dentistId/:id', authRequired, requireRole('ADMIN', 'ODONTOLOGO'), deleteAvailability)

export default router
