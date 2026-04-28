import { z } from 'zod'
import { Dentist, Patient, User, UserPermission } from '../models/index.js'
import { getUserByEmail, hashPassword, validatePasswordStrength } from '../services/auth.service.js'
import { findScopedDentistByUserId, findScopedPatientByEmail } from '../utils/clinicScope.js'
import { sanitizeDentistProfile, sanitizePatientProfile } from '../utils/sanitizers.js'

const patientUpdateSchema = z.object({
    fullName: z.string().min(2).max(150).optional(),
    dni: z.string().min(3).max(30).optional(),
    phone: z.string().min(5).max(40).optional(),
    email: z.string().email().optional()
})

const dentistUpdateSchema = z.object({
    fullName: z.string().min(2).max(150).optional(),
    photoUrl: z.string().max(255).optional(),
    bio: z.string().max(2000).optional(),
    specialties: z.union([z.string(), z.array(z.string().min(2).max(120)).max(10)]).optional(),
    license: z.string().min(3).max(80).optional(),
    specialty: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).max(120).optional()
})

const findPatientByUser = async (user) => {
    return findScopedPatientByEmail(user.clinicId, user.email)
}

const findDentistByUser = async (user) => {
    return findScopedDentistByUserId(user.clinicId, user.id)
}

const VIEW_KEYS = ['TURNOS', 'PACIENTES', 'OBRAS_SOCIALES', 'PAGOS']

export const getPermissions = async (req, res) => {
    if (req.user.role === 'ADMIN') {
        return res.json({
            permissions: VIEW_KEYS.map((viewKey) => ({
                viewKey,
                canRead: true,
                canWrite: true
            }))
        })
    }

    if (req.user.role !== 'ODONTOLOGO') {
        return res.json({ permissions: [] })
    }

    const rows = await UserPermission.findAll({ where: { userId: req.user.id } })
    const merged = VIEW_KEYS.map((viewKey) => {
        const row = rows.find((r) => r.viewKey === viewKey)
        return {
            viewKey,
            canRead: row?.canRead || false,
            canWrite: row?.canWrite || false
        }
    })
    res.json({ permissions: merged })
}

export const getProfile = async (req, res) => {
    const { role, email, id } = req.user

    if (role === 'PACIENTE') {
        const patient = await findPatientByUser({ email, clinicId: req.clinicId })
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })
        return res.json({ type: 'patient', data: sanitizePatientProfile(patient) })
    }

    if (role === 'ADMIN' || role === 'ODONTOLOGO') {
        const dentist = await findDentistByUser({ id, clinicId: req.clinicId })
        if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })
        return res.json({ type: 'dentist', data: sanitizeDentistProfile(dentist) })
    }

    return res.status(403).json({ message: 'Rol sin perfil configurado' })
}

export const updateProfile = async (req, res) => {
    const { role, email, id } = req.user

    if (role === 'PACIENTE') {
        const patient = await findPatientByUser({ email, clinicId: req.clinicId })
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })
        const parsed = patientUpdateSchema.safeParse(req.body)
        if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
        if (parsed.data.email) {
            const exists = await getUserByEmail(parsed.data.email)
            if (exists && exists.id !== req.user.id) {
                return res.status(409).json({ message: 'Email ya registrado' })
            }
            await User.update({ email: parsed.data.email }, { where: { id } })
        }
        await patient.update(parsed.data)
        return res.json({ type: 'patient', data: sanitizePatientProfile(patient) })
    }

    if (role === 'ADMIN' || role === 'ODONTOLOGO') {
        const dentist = await findDentistByUser({ id, clinicId: req.clinicId })
        if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })
        const parsed = dentistUpdateSchema.safeParse(req.body)
        if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
        const updateData = { ...parsed.data }
        if (parsed.data.specialties !== undefined) {
            const specialties = Array.isArray(parsed.data.specialties)
                ? parsed.data.specialties.map((s) => String(s).trim()).filter(Boolean)
                : typeof parsed.data.specialties === 'string'
                    ? parsed.data.specialties.split(',').map((s) => s.trim()).filter(Boolean)
                    : []
            updateData.specialties = specialties.length ? JSON.stringify(specialties) : null
        }
        if (parsed.data.email) {
            const exists = await getUserByEmail(parsed.data.email)
            if (exists && exists.id !== req.user.id) {
                return res.status(409).json({ message: 'Email ya registrado' })
            }
            await User.update({ email: parsed.data.email }, { where: { id } })
        }
        if (parsed.data.password) {
            if (!validatePasswordStrength(parsed.data.password)) {
                return res.status(400).json({ message: 'La contraseña es debil' })
            }
            const passwordHash = await hashPassword(parsed.data.password)
            await User.update({ passwordHash }, { where: { id } })
        }
        await dentist.update(updateData)
        return res.json({ type: 'dentist', data: sanitizeDentistProfile(dentist) })
    }

    return res.status(403).json({ message: 'Rol sin perfil configurado' })
}
