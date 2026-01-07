import { Router } from 'express'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'
import { cancelAppointment, createAppointment, getAvailability, myAppointments, rescheduleAppointment, updateStatus } from '../controllers/appointments.controller.js'

const router = Router()

router.get('/availability', authRequired, requireViewPermission('TURNOS', 'read'), getAvailability)
router.get('/my', authRequired, myAppointments)

router.post('/', authRequired, requireRole('PACIENTE', 'RECEPCION', 'ADMIN', 'ODONTOLOGO'), requireViewPermission('TURNOS', 'write'), createAppointment)
router.patch('/:id/cancel', authRequired, requireRole('PACIENTE', 'ODONTOLOGO', 'ADMIN'), requireViewPermission('TURNOS', 'write'), cancelAppointment)
router.patch('/:id/status', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('TURNOS', 'write'), updateStatus)
router.patch('/:id/reschedule', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('TURNOS', 'write'), rescheduleAppointment)

export default router
