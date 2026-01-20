import { Router } from 'express'
import { listDentists, listSpecialties, createDentist, updateDentist, getDentistAvailability } from '../controllers/dentists.controller.js'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'

const router = Router()

router.get('/', listDentists)
router.get('/specialties', listSpecialties)
router.get('/:id/availability', authRequired, requireViewPermission('TURNOS', 'read'), getDentistAvailability)
router.post('/', authRequired, requireRole('ADMIN'), createDentist)
router.patch('/:id', authRequired, requireRole('ADMIN', 'ODONTOLOGO'), updateDentist)

export default router
