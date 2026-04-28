import { z } from 'zod'
import { Availability, Dentist, User } from '../models/index.js'
import { Op } from 'sequelize'
import { getUserByEmail, hashPassword, validatePasswordStrength } from '../services/auth.service.js'
import { logAudit } from '../services/audit.service.js'
import { findScopedDentistById, scopedUserInclude } from '../utils/clinicScope.js'
import { sanitizeDentistProfile, sanitizeDentistSummary } from '../utils/sanitizers.js'

export const listDentists = async (req, res) => {
    const specialty = req.query.specialty
    const where = {}
    if (specialty) {
        where[Op.or] = [
            { specialty: { [Op.like]: `%${specialty}%` } },
            { specialties: { [Op.like]: `%${specialty}%` } }
        ]
    }

    const dentists = await Dentist.findAll({
        where,
        include: [scopedUserInclude(req.clinicId, [])]
    })

    res.json({ dentists: dentists.map((d) => sanitizeDentistSummary(d)) })
}

export const listSpecialties = async (_req, res) => {
    const rows = await Dentist.findAll({
        attributes: ['specialty', 'specialties'],
        include: [scopedUserInclude(_req.clinicId, [])]
    })
    const set = new Set()
    rows.forEach((row) => {
        if (row.specialty) set.add(row.specialty)
        const extra = sanitizeDentistSummary(row).specialties
        extra.forEach((s) => set.add(s))
    })
    res.json({ specialties: Array.from(set) })
}

const createDentistSchema = z.object({
    fullName: z.string().min(2).max(150).optional(),
    photoUrl: z.string().max(255).optional(),
    bio: z.string().max(2000).optional(),
    specialties: z.union([z.string(), z.array(z.string().min(2).max(120)).max(10)]).optional(),
    email: z.string().email(),
    password: z.string().min(6),
    license: z.string().min(3),
    specialty: z.string().min(2)
})

export const createDentist = async (req, res) => {
    const data = createDentistSchema.parse(req.body)
    if (!validatePasswordStrength(data.password)) {
        return res.status(400).json({ message: 'La contraseña es debil' })
    }

    const exists = await getUserByEmail(data.email)
    if (exists) return res.status(409).json({ message: 'Email ya registrado' })

    const passwordHash = await hashPassword(data.password)
    const user = await User.create({ email: data.email, passwordHash, role: 'ODONTOLOGO', clinicId: req.clinicId })
    const specialties = Array.isArray(data.specialties)
        ? data.specialties.map((s) => String(s).trim()).filter(Boolean)
        : typeof data.specialties === 'string'
            ? data.specialties.split(',').map((s) => s.trim()).filter(Boolean)
            : []
    const dentist = await Dentist.create({
        userId: user.id,
        fullName: data.fullName || null,
        photoUrl: data.photoUrl || null,
        bio: data.bio || null,
        specialties: specialties.length ? JSON.stringify(specialties) : null,
        license: data.license,
        specialty: data.specialty
    })

    await logAudit({ userId: req.user?.id, action: 'ADMIN_CREATE_DENTIST', details: { targetUserId: user.id } })
    res.status(201).json({
        dentist: sanitizeDentistSummary(dentist)
    })
}

const updateDentistSchema = z.object({
    fullName: z.string().min(2).max(150).optional(),
    photoUrl: z.string().max(255).optional(),
    bio: z.string().max(2000).optional(),
    specialties: z.union([z.string(), z.array(z.string().min(2).max(120)).max(10)]).optional(),
    license: z.string().min(3).optional(),
    specialty: z.string().min(2).optional()
})

export const updateDentist = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const dentist = await findScopedDentistById(req.clinicId, id)
    if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })

    // si es odontologo, solo puede editarse a si mismo
    if (req.user.role === 'ODONTOLOGO' && req.user.id !== dentist.userId) {
        return res.status(403).json({ message: 'No puedes editar otro odontologo' })
    }

    const parsed = updateDentistSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    }

    const updateData = { ...parsed.data }
    if (parsed.data.specialties !== undefined) {
        const specialties = Array.isArray(parsed.data.specialties)
            ? parsed.data.specialties.map((s) => String(s).trim()).filter(Boolean)
            : typeof parsed.data.specialties === 'string'
                ? parsed.data.specialties.split(',').map((s) => s.trim()).filter(Boolean)
                : []
        updateData.specialties = specialties.length ? JSON.stringify(specialties) : null
    }
    await dentist.update(updateData)
    res.json({ dentist: sanitizeDentistProfile(dentist) })
}

export const getDentistAvailability = async (req, res) => {
    const dentistId = Number(req.params.id)
    if (!dentistId) return res.status(400).json({ message: 'ID requerido' })

    const dentist = await findScopedDentistById(req.clinicId, dentistId)
    if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })

    const rows = await Availability.findAll({
        where: { dentistId },
        order: [['weekday', 'ASC']]
    })
    res.json({ availability: rows })
}
