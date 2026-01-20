import { Router } from 'express'
import { createPublicAppointment, getPublicAvailability } from '../controllers/public.controller.js'

const router = Router()

router.get('/availability', getPublicAvailability)
router.post('/appointments', createPublicAppointment)

export default router
