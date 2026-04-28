import { Router } from 'express'
import { listDentists, listSpecialties, createDentist, updateDentist, getDentistAvailability } from '../controllers/dentists.controller.js'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'

const router = Router()

router.get('/', authRequired, requireClinicScope, requireViewPermission('TURNOS', 'read'), listDentists)
router.get('/specialties', authRequired, requireClinicScope, requireViewPermission('TURNOS', 'read'), listSpecialties)
router.get('/:id/availability', authRequired, requireClinicScope, requireViewPermission('TURNOS', 'read'), getDentistAvailability)
router.post('/', authRequired, requireClinicScope, requireRole('ADMIN'), createDentist)
router.patch('/:id', authRequired, requireClinicScope, requireRole('ADMIN', 'ODONTOLOGO'), updateDentist)

export default router
