import { z } from 'zod'
import { Availability, Dentist } from '../models/index.js'
import { findScopedDentistById, findScopedDentistByUserId } from '../utils/clinicScope.js'

const availabilitySchema = z.object({
    weekday: z.number().int().min(0).max(6),
    fromTime: z.string().regex(/^\d{2}:\d{2}$/),
    toTime: z.string().regex(/^\d{2}:\d{2}$/),
    slotMinutes: z.number().int().positive().max(240)
})

const ensureOwnership = async (req, dentistId) => {
    if (req.user.role === 'ADMIN') {
        return Boolean(await findScopedDentistById(req.clinicId, dentistId))
    }
    if (req.user.role !== 'ODONTOLOGO') return false
    const dentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
    return dentist && dentist.id === dentistId
}

export const listAvailability = async (req, res) => {
    const dentistId = Number(req.params.dentistId)
    if (!dentistId) return res.status(400).json({ message: 'dentistId requerido' })

    if (!(await ensureOwnership(req, dentistId))) {
        return res.status(403).json({ message: 'Sin permisos' })
    }

    const rows = await Availability.findAll({ where: { dentistId }, order: [['weekday', 'ASC']] })
    res.json({ availability: rows })
}

export const upsertAvailability = async (req, res) => {
    const dentistId = Number(req.params.dentistId)
    if (!dentistId) return res.status(400).json({ message: 'dentistId requerido' })

    if (!(await ensureOwnership(req, dentistId))) {
        return res.status(403).json({ message: 'Sin permisos' })
    }

    const parsed = availabilitySchema.array().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })

    // estrategia simple: borrar disponibilidad existente y recrear
    await Availability.destroy({ where: { dentistId } })
    const toCreate = parsed.data.map((row) => ({ ...row, dentistId }))
    const created = await Availability.bulkCreate(toCreate)

    res.status(201).json({ availability: created })
}

export const deleteAvailability = async (req, res) => {
    const dentistId = Number(req.params.dentistId)
    const id = Number(req.params.id)
    if (!dentistId || !id) return res.status(400).json({ message: 'IDs requeridos' })

    if (!(await ensureOwnership(req, dentistId))) {
        return res.status(403).json({ message: 'Sin permisos' })
    }

    await Availability.destroy({ where: { id, dentistId } })
    res.json({ ok: true })
}
