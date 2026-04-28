import { Router } from 'express'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'
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

router.use(authRequired, requireClinicScope)

router.get('/', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), listPatients)
router.post('/', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'write'), createPatient)
router.get('/:id/appointments', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientAppointments)
router.get('/:id/studies/:studyId', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientStudyFile)
router.get('/:id/implants', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), listPatientImplants)
router.post('/:id/implants', requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), createPatientImplant)
router.get('/:id/implants/:implantId', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientImplant)
router.patch('/:id/implants/:implantId', requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), updatePatientImplant)
router.delete('/:id/implants/:implantId', requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), deletePatientImplant)
router.get('/:id/implants/:implantId/files/:fileId', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatientImplantFile)
router.get('/:id', requireRole('ODONTOLOGO', 'ADMIN', 'RECEPCION'), requireViewPermission('PACIENTES', 'read'), getPatient)
router.patch('/:id', requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('PACIENTES', 'write'), updatePatient)

export default router
