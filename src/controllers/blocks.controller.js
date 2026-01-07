import { z } from 'zod'
import { Block, Dentist } from '../models/index.js'

const blockSchema = z.object({
    fromDateTime: z.string().datetime(),
    toDateTime: z.string().datetime(),
    reason: z.string().max(200).optional()
})

const ensureOwnership = async (req, dentistId) => {
    if (req.user.role === 'ADMIN') return true
    if (req.user.role !== 'ODONTOLOGO') return false
    const dentist = await Dentist.findOne({ where: { userId: req.user.id } })
    return dentist && dentist.id === dentistId
}

export const listBlocks = async (req, res) => {
    const dentistId = Number(req.params.dentistId)
    if (!dentistId) return res.status(400).json({ message: 'dentistId requerido' })

    if (!(await ensureOwnership(req, dentistId))) {
        return res.status(403).json({ message: 'Sin permisos' })
    }

    const rows = await Block.findAll({ where: { dentistId }, order: [['fromDateTime', 'ASC']] })
    res.json({ blocks: rows })
}

export const createBlock = async (req, res) => {
    const dentistId = Number(req.params.dentistId)
    if (!dentistId) return res.status(400).json({ message: 'dentistId requerido' })

    if (!(await ensureOwnership(req, dentistId))) {
        return res.status(403).json({ message: 'Sin permisos' })
    }

    const parsed = blockSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })

    const start = new Date(parsed.data.fromDateTime)
    const end = new Date(parsed.data.toDateTime)
    if (!(start < end)) return res.status(400).json({ message: 'Rango horario invalido' })

    const block = await Block.create({
        dentistId,
        fromDateTime: start,
        toDateTime: end,
        reason: parsed.data.reason || null
    })

    res.status(201).json({ block })
}

export const deleteBlock = async (req, res) => {
    const dentistId = Number(req.params.dentistId)
    const id = Number(req.params.id)
    if (!dentistId || !id) return res.status(400).json({ message: 'IDs requeridos' })

    if (!(await ensureOwnership(req, dentistId))) {
        return res.status(403).json({ message: 'Sin permisos' })
    }

    await Block.destroy({ where: { id, dentistId } })
    res.json({ ok: true })
}
