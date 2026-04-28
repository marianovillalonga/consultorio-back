import { Router } from 'express'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { requireClinicScope } from '../middlewares/clinicScope.js'
import { listBlocks, createBlock, deleteBlock } from '../controllers/blocks.controller.js'

const router = Router()

router.use(authRequired, requireClinicScope, requireRole('ADMIN', 'ODONTOLOGO'))

router.get('/:dentistId', listBlocks)
router.post('/:dentistId', createBlock)
router.delete('/:dentistId/:id', deleteBlock)

export default router
