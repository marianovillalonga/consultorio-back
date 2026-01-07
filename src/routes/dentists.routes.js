import { Router } from 'express'
import { listDentists, listSpecialties, createDentist, updateDentist } from '../controllers/dentists.controller.js'
import { authRequired, requireRole } from '../middlewares/auth.js'

const router = Router()

router.get('/', listDentists)
router.get('/specialties', listSpecialties)
router.post('/', authRequired, requireRole('ADMIN'), createDentist)
router.patch('/:id', authRequired, requireRole('ADMIN', 'ODONTOLOGO'), updateDentist)

export default router
