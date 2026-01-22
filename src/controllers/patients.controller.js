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
            'treatmentPlanItems',
            'studies',
            'studiesFiles',
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

    const json = patient.toJSON()
    if (json.studiesFiles) {
        const parsed = parseStudyFiles(json.studiesFiles)
        if (parsed.ok) {
            json.studiesFiles = JSON.stringify(stripStudyData(parsed.items))
        }
    }

    res.json({ patient: json })
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
    note: z.string().max(200).optional(),
    serviceAmount: z.number().optional(),
    implantId: z.number().int().optional(),
    implantStage: z.string().max(40).optional(),
    planItemId: z.string().max(80).optional()
})

const studyFileSchema = z.object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(255),
    mime: z.string().min(1).max(200),
    data: z.string().optional(),
    description: z.string().max(500).optional(),
    createdAt: z.string().min(1).max(40),
    uploadedBy: z.number().int().optional()
})

const studyFilesSchema = z.array(studyFileSchema)

const basePatientSchema = {
    fullName: z.string().min(2).max(150),
    dni: z.string().min(3).max(30).optional(),
    phone: z.string().min(5).max(40).optional(),
    email: z.string().email().optional(),
    obraSocial: z.string().min(2).max(120).optional(),
    obraSocialNumero: z.string().min(1).max(80).optional(),
    historialClinico: z.string().max(5000).optional(),
    treatmentPlan: z.string().max(5000).optional(),
    treatmentPlanItems: z.string().max(20000).optional(),
    studies: z.string().max(5000).optional(),
    studiesFiles: z.string().max(50000000).optional(),
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

    const payload = { ...parsed.data }
    if (payload.studiesFiles !== undefined) {
        const merged = mergeStudyFiles(payload.studiesFiles, patient.studiesFiles, req.user?.id)
        if (!merged.ok) return res.status(400).json({ message: merged.error })
        payload.studiesFiles = merged.value
    }

    try {
        await patient.update(payload)
        res.json({ patient })
    } catch (err) {
        console.error('[patients.update] Error al actualizar', err)
        res.status(500).json({ message: err?.message || 'No se pudo actualizar el paciente' })
    }
}

export const getPatientStudyFile = async (req, res) => {
    const id = Number(req.params.id)
    const studyId = String(req.params.studyId || '')
    if (!id || !studyId) return res.status(400).json({ message: 'Parametros invalidos' })

    const patient = await Patient.findByPk(id)
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    const parsed = parseStudyFiles(patient.studiesFiles)
    if (!parsed.ok) return res.status(400).json({ message: parsed.error })

    const item = parsed.items.find((f) => f.id === studyId)
    if (!item || !item.data) return res.status(404).json({ message: 'Archivo no encontrado' })

    res.json({
        file: {
            id: item.id,
            name: item.name,
            mime: item.mime,
            data: item.data,
            description: item.description || '',
            createdAt: item.createdAt,
            uploadedBy: item.uploadedBy || null
        }
    })
}

const parseStudyFiles = (raw) => {
    if (!raw) return { ok: true, items: [] }
    try {
        if (typeof raw === 'string' && raw.trim() === '') return { ok: true, items: [] }
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        const validated = studyFilesSchema.safeParse(parsed)
        if (!validated.success) return { ok: false, error: 'studiesFiles invalido' }
        return { ok: true, items: validated.data }
    } catch {
        return { ok: false, error: 'studiesFiles invalido' }
    }
}

const stripStudyData = (items) =>
    items.map((item) => ({
        id: item.id,
        name: item.name,
        mime: item.mime,
        description: item.description || '',
        createdAt: item.createdAt,
        uploadedBy: item.uploadedBy || null
    }))

const normalizeIsoDate = (value, fallback) => {
    const date = value ? new Date(value) : null
    if (date && !Number.isNaN(date.getTime())) return date.toISOString()
    return fallback || new Date().toISOString()
}

const mergeStudyFiles = (incomingRaw, existingRaw, userId) => {
    const incoming = parseStudyFiles(incomingRaw)
    if (!incoming.ok) return { ok: false, error: incoming.error }

    const existing = parseStudyFiles(existingRaw)
    const existingItems = existing.ok ? existing.items : []
    const existingMap = new Map(existingItems.map((item) => [item.id, item]))

    const merged = []
    for (const item of incoming.items) {
        const prev = existingMap.get(item.id)
        const data = item.data && item.data.length > 0 ? item.data : prev?.data
        if (!data) return { ok: false, error: `Falta data para el archivo ${item.name}` }

        merged.push({
            id: item.id,
            name: item.name,
            mime: item.mime,
            data,
            description: item.description || '',
            createdAt: normalizeIsoDate(item.createdAt, prev?.createdAt),
            uploadedBy: item.uploadedBy || prev?.uploadedBy || userId || null
        })
    }

    return { ok: true, value: JSON.stringify(merged) }
}
