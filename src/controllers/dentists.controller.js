import { z } from 'zod'
import { Dentist, User } from '../models/index.js'
import { Op, fn, col } from 'sequelize'
import { getUserByEmail, hashPassword, validatePasswordStrength } from '../services/auth.service.js'
import { logAudit } from '../services/audit.service.js'

export const listDentists = async (req, res) => {
    const specialty = req.query.specialty
    const where = {}
    if (specialty) {
        where.specialty = { [Op.like]: `%${specialty}%` }
    }

    const dentists = await Dentist.findAll({
        where,
        include: [{ model: User, attributes: ['id', 'email', 'role'], required: true }]
    })

    res.json({
        dentists: dentists.map((d) => ({
            id: d.id,
            userId: d.userId,
            specialty: d.specialty,
            license: d.license,
            user: d.User ? { id: d.User.id, email: d.User.email, role: d.User.role } : null
        }))
    })
}

export const listSpecialties = async (_req, res) => {
    const rows = await Dentist.findAll({
        attributes: [[fn('DISTINCT', col('specialty')), 'specialty']],
        where: { specialty: { [Op.ne]: null } }
    })
    const specialties = rows.map((r) => r.get('specialty')).filter(Boolean)
    res.json({ specialties })
}

const createDentistSchema = z.object({
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
    const dentist = await Dentist.create({ userId: user.id, license: data.license, specialty: data.specialty })

    await logAudit({ userId: req.user?.id, action: 'ADMIN_CREATE_DENTIST', details: { targetUserId: user.id } })
    res.status(201).json({
        user: { id: user.id, email: user.email, role: user.role },
        dentist
    })
}

const updateDentistSchema = z.object({
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

    await dentist.update(parsed.data)
    res.json({ dentist })
}
