import { Router } from 'express'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'
import { cancelAppointment, createAppointment, getAvailability, myAppointments, rescheduleAppointment, updateStatus } from '../controllers/appointments.controller.js'

const router = Router()

router.use(authRequired, requireClinicScope)

router.get('/availability', requireViewPermission('TURNOS', 'read'), getAvailability)
router.get('/my', myAppointments)

router.post('/', requireRole('PACIENTE', 'RECEPCION', 'ADMIN', 'ODONTOLOGO'), requireViewPermission('TURNOS', 'write'), createAppointment)
router.patch('/:id/cancel', requireRole('PACIENTE', 'ODONTOLOGO', 'ADMIN'), requireViewPermission('TURNOS', 'write'), cancelAppointment)
router.patch('/:id/status', requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('TURNOS', 'write'), updateStatus)
router.patch('/:id/reschedule', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('TURNOS', 'write'), rescheduleAppointment)

export default router
