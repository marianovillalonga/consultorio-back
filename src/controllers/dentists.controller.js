import { z } from 'zod'
import { Availability, Dentist, User } from '../models/index.js'
import { Op } from 'sequelize'
import { getUserByEmail, hashPassword, validatePasswordStrength } from '../services/auth.service.js'
import { logAudit } from '../services/audit.service.js'

const normalizeSpecialties = (value) => {
    if (!value) return []
    if (Array.isArray(value)) {
        return value.map((s) => String(s).trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    }
    return []
}

const serializeDentist = (dentist) => {
    const json = dentist.toJSON ? dentist.toJSON() : dentist
    let specialties = []
    if (json.specialties) {
        try {
            const parsed = JSON.parse(json.specialties)
            if (Array.isArray(parsed)) specialties = parsed
        } catch {
            specialties = normalizeSpecialties(json.specialties)
        }
    }
    if (!specialties.length && json.specialty) {
        specialties = [json.specialty]
    }
    return {
        id: json.id,
        userId: json.userId,
        fullName: json.fullName || null,
        photoUrl: json.photoUrl || null,
        bio: json.bio || null,
        specialties,
        specialty: json.specialty || null,
        license: json.license || null,
        user: json.User ? { id: json.User.id, email: json.User.email, role: json.User.role } : null
    }
}

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
        include: [{ model: User, attributes: ['id', 'email', 'role'], required: true }]
    })

    res.json({ dentists: dentists.map((d) => serializeDentist(d)) })
}

export const listSpecialties = async (_req, res) => {
    const rows = await Dentist.findAll({ attributes: ['specialty', 'specialties'] })
    const set = new Set()
    rows.forEach((row) => {
        if (row.specialty) set.add(row.specialty)
        const extra = normalizeSpecialties(row.specialties)
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
    const user = await User.create({ email: data.email, passwordHash, role: 'ODONTOLOGO' })
    const specialties = normalizeSpecialties(data.specialties)
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
        user: { id: user.id, email: user.email, role: user.role },
        dentist
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

    const dentist = await Dentist.findByPk(id)
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
        const specialties = normalizeSpecialties(parsed.data.specialties)
        updateData.specialties = specialties.length ? JSON.stringify(specialties) : null
    }
    await dentist.update(updateData)
    res.json({ dentist })
}

export const getDentistAvailability = async (req, res) => {
    const dentistId = Number(req.params.id)
    if (!dentistId) return res.status(400).json({ message: 'ID requerido' })

    const rows = await Availability.findAll({
        where: { dentistId },
        order: [['weekday', 'ASC']]
    })
    res.json({ availability: rows })
}
