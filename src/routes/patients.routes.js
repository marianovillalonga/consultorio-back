import { Router } from 'express'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'
import { listPatients, getPatientAppointments, updatePatient, createPatient, getPatient } from '../controllers/patients.controller.js'

const router = Router()

router.get('/', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), listPatients)
router.post('/', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'write'), createPatient)
router.get('/:id/appointments', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientAppointments)
router.get('/:id', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatient)
router.patch('/:id', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), updatePatient)

export default router
