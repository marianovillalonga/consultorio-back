import { Router } from 'express'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'
import {
  listPatients,
  getPatientAppointments,
  updatePatient,
  createPatient,
  getPatient,
  getPatientStudyFile
} from '../controllers/patients.controller.js'
import {
  listPatientImplants,
  createPatientImplant,
  getPatientImplant,
  updatePatientImplant,
  deletePatientImplant,
  getPatientImplantFile
} from '../controllers/implants.controller.js'

const router = Router()

router.get('/', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), listPatients)
router.post('/', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'write'), createPatient)
router.get('/:id/appointments', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientAppointments)
router.get('/:id/studies/:studyId', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientStudyFile)
router.get('/:id/implants', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), listPatientImplants)
router.post('/:id/implants', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), createPatientImplant)
router.get('/:id/implants/:implantId', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientImplant)
router.patch('/:id/implants/:implantId', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), updatePatientImplant)
router.delete('/:id/implants/:implantId', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), deletePatientImplant)
router.get('/:id/implants/:implantId/files/:fileId', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientImplantFile)
router.get('/:id', authRequired, requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatient)
router.patch('/:id', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), updatePatient)

export default router
