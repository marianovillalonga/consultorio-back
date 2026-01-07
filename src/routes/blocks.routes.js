import { Router } from 'express'
import { authRequired, requireRole } from '../middlewares/auth.js'
import { listBlocks, createBlock, deleteBlock } from '../controllers/blocks.controller.js'

const router = Router()

router.get('/:dentistId', authRequired, requireRole('ADMIN', 'ODONTOLOGO'), listBlocks)
router.post('/:dentistId', authRequired, requireRole('ADMIN', 'ODONTOLOGO'), createBlock)
router.delete('/:dentistId/:id', authRequired, requireRole('ADMIN', 'ODONTOLOGO'), deleteBlock)

export default router
