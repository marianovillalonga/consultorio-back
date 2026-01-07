import { Router } from 'express'
import { createObra, deleteObra, listObras, updateObra } from '../controllers/obrasSociales.controller.js'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'

const router = Router()

router.get('/', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'read'), listObras)
router.post('/', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'write'), createObra)
router.put('/:id', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'write'), updateObra)
router.delete('/:id', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'write'), deleteObra)

export default router
