import { Router } from 'express'
import { createObra, deleteObra, listObras, updateObra, scrapeObras } from '../controllers/obrasSociales.controller.js'
import { authRequired, requireRole, requireViewPermission } from '../middlewares/auth.js'

const router = Router()

router.get('/', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'read'), listObras)
router.post('/', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'write'), createObra)
router.post('/scrape', authRequired, requireRole('ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'write'), scrapeObras)
router.put('/:id', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'write'), updateObra)
router.delete('/:id', authRequired, requireRole('ODONTOLOGO', 'ADMIN'), requireViewPermission('OBRAS_SOCIALES', 'write'), deleteObra)

export default router
