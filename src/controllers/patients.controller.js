import { Patient, Appointment, Dentist, User } from '../models/index.js'
import { z } from 'zod'

// Listar pacientes con datos básicos y saldo
export const listPatients = async (_req, res) => {
    const patients = await Patient.findAll({
        attributes: [
            'id',
            'fullName',
            'email',
            'dni',
            'phone',
            'obraSocial',
            'obraSocialNumero',
            'historialClinico',
            'treatmentPlan',
            'studies',
            'historyEntries',
            'balance'
        ],
        order: [['fullName', 'ASC']]
    })
    res.json({ patients })
}

export const getPatient = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const patient = await Patient.findByPk(id)
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    res.json({ patient })
}

// Turnos recientes de un paciente para mostrar en el detalle
export const getPatientAppointments = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const appts = await Appointment.findAll({
        where: { patientId: id },
        order: [['startAt', 'DESC']],
        limit: 10,
        include: [{ model: Dentist, include: [{ model: User, attributes: ['email'] }] }]
    })

    const serialized = appts.map((a) => {
        const json = a.toJSON()
        return { ...json, dentist: json.Dentist }
    })

    res.json({ appointments: serialized })
}

const paymentSchema = z.object({
    amount: z.number(),
    method: z.string().min(2).max(50),
    date: z.string().datetime(),
    note: z.string().max(200).optional()
})

const basePatientSchema = {
    fullName: z.string().min(2).max(150),
    dni: z.string().min(3).max(30).optional(),
    phone: z.string().min(5).max(40).optional(),
    email: z.string().email().optional(),
    obraSocial: z.string().min(2).max(120).optional(),
    obraSocialNumero: z.string().min(1).max(80).optional(),
    historialClinico: z.string().max(5000).optional(),
    treatmentPlan: z.string().max(5000).optional(),
    studies: z.string().max(5000).optional(),
    historyEntries: z.string().max(20000).optional(),
    balance: z.number().optional(),
    payments: paymentSchema.array().optional(),
    odontograma: z.string().max(8000).optional()
}

const createPatientSchema = z.object({
    ...basePatientSchema,
    fullName: z.string().min(2).max(150)
})

const updatePatientSchema = z.object({
    ...basePatientSchema,
    fullName: basePatientSchema.fullName.optional()
})

export const createPatient = async (req, res) => {
    const parsed = createPatientSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })

    const patient = await Patient.create(parsed.data)
    res.status(201).json({ patient })
}

export const updatePatient = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const parsed = updatePatientSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })

    const patient = await Patient.findByPk(id)
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    await patient.update(parsed.data)

    res.json({ patient })
}
