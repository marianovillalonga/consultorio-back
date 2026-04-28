import { z } from 'zod'
import { Dentist, User } from '../models/index.js'
import { getUserByEmail, hashPassword, validatePasswordStrength } from '../services/auth.service.js'
import { logAudit } from '../services/audit.service.js'
import { sequelize } from '../db/sequelize.js'
import { sanitizeAdminUser } from '../utils/sanitizers.js'

export const listUsers = async (req, res) => {
    const where = { role: 'ODONTOLOGO', clinicId: req.clinicId }

    const users = await User.findAll({
        where,
        order: [['createdAt', 'DESC']]
    })

    res.json({
        users: users.map((u) => sanitizeAdminUser(u))
    })
}

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    active: z.boolean().optional()
})

export const createUser = async (req, res) => {
    const data = createUserSchema.parse(req.body)
    if (!validatePasswordStrength(data.password)) {
        return res.status(400).json({ message: 'La contrasena es debil' })
    }

    const exists = await getUserByEmail(data.email)
    if (exists) return res.status(409).json({ message: 'Email ya registrado' })

    const passwordHash = await hashPassword(data.password)
    let user = null

    await sequelize.transaction(async (transaction) => {
        user = await User.create({
            email: data.email,
            passwordHash,
            role: 'ODONTOLOGO',
            clinicId: req.clinicId,
            active: data.active ?? true
        }, { transaction })

        const existingDentist = await Dentist.findOne({
            where: { userId: user.id },
            transaction
        })
        if (existingDentist) {
            const err = new Error('Ya existe un perfil de odontologo para este usuario')
            err.status = 409
            throw err
        }

        await Dentist.create({
            userId: user.id,
            fullName: null,
            photoUrl: null,
            bio: null,
            specialties: JSON.stringify([]),
            license: null,
            specialty: null
        }, { transaction })
    }).catch((err) => {
        if (err?.status === 409) {
            return res.status(409).json({ message: err.message })
        }
        throw err
    })

    if (res.headersSent) return

    await logAudit({ userId: req.user.id, action: 'ADMIN_CREATE_USER', details: { targetUserId: user.id } })
    res.status(201).json({
        user: sanitizeAdminUser(user)
    })
}

const updateUserSchema = z.object({
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    active: z.boolean().optional()
})

export const updateUser = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const user = await User.findOne({ where: { id, clinicId: req.clinicId } })
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    if (user.role !== 'ODONTOLOGO') {
        return res.status(400).json({ message: 'Solo se pueden editar cuentas de odontologo' })
    }

    const parsed = updateUserSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    }

    if (parsed.data.password && !validatePasswordStrength(parsed.data.password)) {
        return res.status(400).json({ message: 'La contrasena es debil' })
    }

    if (parsed.data.email && parsed.data.email !== user.email) {
        const exists = await getUserByEmail(parsed.data.email)
        if (exists) return res.status(409).json({ message: 'Email ya registrado' })
    }

    const next = { ...parsed.data }
    if (parsed.data.password) {
        next.passwordHash = await hashPassword(parsed.data.password)
        delete next.password
    }

    await user.update(next)
    await logAudit({ userId: req.user.id, action: 'ADMIN_UPDATE_USER', details: { targetUserId: user.id } })

    res.json({
        user: sanitizeAdminUser(user)
    })
}
