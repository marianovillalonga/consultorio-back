import { z } from 'zod'
import { Dentist, Patient, User } from '../models/index.js'
import { getUserByEmail, hashPassword, validatePasswordStrength } from '../services/auth.service.js'

const patientUpdateSchema = z.object({
    fullName: z.string().min(2).max(150).optional(),
    dni: z.string().min(3).max(30).optional(),
    phone: z.string().min(5).max(40).optional(),
    email: z.string().email().optional()
})

const dentistUpdateSchema = z.object({
    license: z.string().min(3).max(80).optional(),
    specialty: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).max(120).optional()
})

const findPatientByUser = async (user) => {
    // No hay clave foranea, se busca por email
    return Patient.findOne({ where: { email: user.email } })
}

const findDentistByUser = async (user) => {
    return Dentist.findOne({ where: { userId: user.id } })
}

export const getProfile = async (req, res) => {
    const { role, email, id } = req.user

    if (role === 'PACIENTE') {
        const patient = await findPatientByUser({ email })
        if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })
        return res.json({ type: 'patient', data: patient })
    }

    if (role === 'ADMIN' || role === 'ODONTOLOGO') {
        const dentist = await findDentistByUser({ id })
        if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })
        return res.json({ type: 'dentist', data: dentist })
    }

    return res.status(403).json({ message: 'Rol sin perfil configurado' })
}

export const updateProfile = async (req, res) => {
    const { role, email, id } = req.user

    if (role === 'PACIENTE') {
        const patient = await findPatientByUser({ email })
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
        return res.json({ type: 'patient', data: patient })
    }

    if (role === 'ADMIN' || role === 'ODONTOLOGO') {
        const dentist = await findDentistByUser({ id })
        if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })
        const parsed = dentistUpdateSchema.safeParse(req.body)
        if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
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
        await dentist.update(parsed.data)
        return res.json({ type: 'dentist', data: dentist })
    }

    return res.status(403).json({ message: 'Rol sin perfil configurado' })
}
