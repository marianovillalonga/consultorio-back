import { Patient, Appointment, Dentist, User } from '../models/index.js'
import { z } from 'zod'
import { deleteFile, getFileBase64, uploadFile } from '../services/storage.service.js'
import { findScopedDentistByUserId, findScopedPatientById } from '../utils/clinicScope.js'
import { sanitizeDentistSummary } from '../utils/sanitizers.js'
import logger from '../lib/logger.js'

const normalizePayments = (raw) => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const computeBalance = (payments) =>
    payments.reduce((acc, p) => {
        const svc = Number(p?.serviceAmount || 0) || 0
        const paid = Number(p?.amount || 0) || 0
        return acc + (paid - svc)
    }, 0)

const MAX_STUDY_FILE_BYTES = 8 * 1024 * 1024

const estimateBase64Bytes = (value) => {
    if (!value) return 0
    const raw = String(value)
    const base64 = raw.includes(',') ? raw.split(',').pop() : raw
    const len = base64.length
    if (!len) return 0
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    return Math.max(0, Math.floor((len * 3) / 4) - padding)
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
    storageKey: z.string().max(400).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    createdAt: z.string().min(1).max(40),
    uploadedBy: z.number().int().optional().nullable()
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

const sanitizeStudyFile = (item) => ({
    id: item.id,
    name: item.name,
    mime: item.mime,
    storageKey: item.storageKey,
    description: item.description || '',
    createdAt: item.createdAt,
    uploadedBy: item.uploadedBy || null
})

const stripStudyData = (items) => items.map((item) => sanitizeStudyFile(item))

const collectStudyStorageKeys = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => item?.storageKey || null)
        .filter(Boolean)

const deleteStorageKeysBestEffort = async (keys = []) => {
    for (const storageKey of keys) {
        try {
            await deleteFile({ storageKey })
        } catch (err) {
            logger.error('patients_storage_delete_failed', {
                storageKey,
                error: err
            })
        }
    }
}

const normalizeIsoDate = (value, fallback) => {
    const date = value ? new Date(value) : null
    if (date && !Number.isNaN(date.getTime())) return date.toISOString()
    return fallback || new Date().toISOString()
}

const mergeStudyFiles = async (incomingRaw, existingRaw, userId) => {
    const incoming = parseStudyFiles(incomingRaw)
    if (!incoming.ok) return { ok: false, error: incoming.error }

    const existing = parseStudyFiles(existingRaw)
    const existingItems = existing.ok ? existing.items : []
    const existingMap = new Map(existingItems.map((item) => [item.id, item]))

    const merged = []
    for (const item of incoming.items) {
        const prev = existingMap.get(item.id)
        const nextItem = {
            id: item.id,
            name: item.name,
            mime: item.mime,
            description: item.description || '',
            createdAt: normalizeIsoDate(item.createdAt, prev?.createdAt),
            uploadedBy: item.uploadedBy || prev?.uploadedBy || userId || null
        }

        if (item.data && item.data.length > 0) {
            const estimatedBytes = estimateBase64Bytes(item.data)
            if (estimatedBytes > MAX_STUDY_FILE_BYTES) {
                return { ok: false, error: `Archivo ${item.name} supera el limite de ${MAX_STUDY_FILE_BYTES} bytes` }
            }
            try {
                const saved = await uploadFile({
                    namespace: 'patients-studies',
                    name: item.name,
                    data: item.data,
                    mime: item.mime
                })
                nextItem.storageKey = saved.storageKey
            } catch (err) {
                logger.warn('patients_storage_upload_failed_inline_fallback', {
                    fileName: item.name,
                    userId: userId || null,
                    error: err
                })
                nextItem.data = item.data
                nextItem.storageKey = null
            }
            merged.push(nextItem)
            continue
        }

        if (prev?.storageKey) {
            nextItem.storageKey = prev.storageKey
            merged.push(nextItem)
            continue
        }

        if (prev?.data) {
            nextItem.data = prev.data
            merged.push(nextItem)
            continue
        }

        return { ok: false, error: `Falta data para el archivo ${item.name}` }
    }

    return { ok: true, value: JSON.stringify(merged) }
}

const serializePatient = (patient) => {
    const json = patient?.toJSON ? patient.toJSON() : { ...patient }
    json.balance = computeBalance(normalizePayments(json.payments))
    const parsed = parseStudyFiles(json.studiesFiles)
    if (parsed.ok) {
        json.studiesFiles = JSON.stringify(stripStudyData(parsed.items))
    }
    return json
}

const getAccessiblePatient = async (req, id) => {
    if (req.user?.role === 'ODONTOLOGO') {
        const dentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
        if (!dentist) return null

        const linked = await Appointment.findOne({
            where: { dentistId: dentist.id, patientId: id },
            include: [{ model: Patient, where: { clinicId: req.clinicId }, attributes: [], required: true }]
        })
        if (!linked) return null
    }

    return findScopedPatientById(req.clinicId, id)
}

// Listar pacientes con datos basicos y saldo
export const listPatients = async (req, res) => {
    let where = { clinicId: req.clinicId }
    if (req.user?.role === 'ODONTOLOGO') {
        const dentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
        if (!dentist) return res.json({ patients: [] })
        const rows = await Appointment.findAll({
            where: { dentistId: dentist.id },
            include: [{ model: Patient, where: { clinicId: req.clinicId }, attributes: [], required: true }],
            attributes: ['patientId'],
            group: ['Appointment.patientId'],
            raw: true
        })
        const patientIds = rows.map((row) => row.patientId).filter(Boolean)
        if (patientIds.length === 0) return res.json({ patients: [] })
        where = { id: patientIds, clinicId: req.clinicId }
    }

    const patients = await Patient.findAll({
        attributes: [
            'id',
            'clinicId',
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
            'payments',
            'balance'
        ],
        where,
        order: [['fullName', 'ASC']]
    })
    res.json({ patients: patients.map((patient) => serializePatient(patient)) })
}

export const getPatient = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const patient = await getAccessiblePatient(req, id)
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    res.json({ patient: serializePatient(patient) })
}

// Turnos recientes de un paciente para mostrar en el detalle
export const getPatientAppointments = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const patient = await getAccessiblePatient(req, id)
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    const where = { patientId: id }
    if (req.user?.role === 'ODONTOLOGO') {
        const dentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
        if (!dentist) return res.json({ appointments: [] })
        where.dentistId = dentist.id
    }

    const appts = await Appointment.findAll({
        where,
        order: [['startAt', 'DESC']],
        limit: 10,
        include: [{ model: Dentist, include: [{ model: User, attributes: [] }] }]
    })

    const serialized = appts.map((a) => {
        const json = a.toJSON()
        return { ...json, dentist: json.Dentist ? sanitizeDentistSummary(json.Dentist) : undefined }
    })

    res.json({ appointments: serialized })
}

export const createPatient = async (req, res) => {
    const parsed = createPatientSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })

    const payload = { ...parsed.data, clinicId: req.clinicId }
    payload.balance = computeBalance(normalizePayments(payload.payments))
    if (payload.studiesFiles !== undefined) {
        const merged = await mergeStudyFiles(payload.studiesFiles, null, req.user?.id)
        if (!merged.ok) return res.status(400).json({ message: merged.error })
        payload.studiesFiles = merged.value
    }

    const patient = await Patient.create(payload)
    res.status(201).json({ patient: serializePatient(patient) })
}

export const updatePatient = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const parsed = updatePatientSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })

    const patient = await getAccessiblePatient(req, id)
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    const before = patient.toJSON()
    const payload = { ...parsed.data }
    delete payload.clinicId
    const nextPayments = payload.payments !== undefined ? payload.payments : patient.payments
    payload.balance = computeBalance(normalizePayments(nextPayments))
    if (payload.studiesFiles !== undefined) {
        const merged = await mergeStudyFiles(payload.studiesFiles, patient.studiesFiles, req.user?.id)
        if (!merged.ok) return res.status(400).json({ message: merged.error })
        payload.studiesFiles = merged.value
    }

    try {
        await patient.update(payload)
        if (payload.studiesFiles !== undefined) {
            const beforeParsed = parseStudyFiles(before.studiesFiles)
            const afterParsed = parseStudyFiles(patient.studiesFiles)
            const previousKeys = new Set(beforeParsed.ok ? collectStudyStorageKeys(beforeParsed.items) : [])
            const nextKeys = new Set(afterParsed.ok ? collectStudyStorageKeys(afterParsed.items) : [])
            const removedKeys = Array.from(previousKeys).filter((key) => !nextKeys.has(key))
            await deleteStorageKeysBestEffort(removedKeys)
        }
        res.json({ patient: serializePatient(patient) })
    } catch (err) {
        logger.error('patients_update_failed', {
            patientId: id,
            userId: req.user?.id || null,
            error: err
        })
        res.status(500).json({ message: err?.message || 'No se pudo actualizar el paciente' })
    }
}

export const getPatientStudyFile = async (req, res) => {
    const id = Number(req.params.id)
    const studyId = String(req.params.studyId || '')
    if (!id || !studyId) return res.status(400).json({ message: 'Parametros invalidos' })

    const patient = await getAccessiblePatient(req, id)
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    const parsed = parseStudyFiles(patient.studiesFiles)
    if (!parsed.ok) return res.status(400).json({ message: parsed.error })

    const item = parsed.items.find((f) => f.id === studyId)
    if (!item) return res.status(404).json({ message: 'Archivo no encontrado' })

    let data = item.data || ''
    if (!data && item.storageKey) {
        try {
            data = await getFileBase64({ storageKey: item.storageKey })
        } catch (err) {
            logger.error('patients_file_read_failed', {
                storageKey: item.storageKey,
                patientId: id,
                studyId,
                error: err
            })
            return res.status(404).json({ message: 'Archivo no encontrado' })
        }
    }

    if (!data) return res.status(404).json({ message: 'Archivo no encontrado' })

    res.json({
        file: {
            id: item.id,
            name: item.name,
            mime: item.mime,
            data,
            description: item.description || '',
            createdAt: item.createdAt,
            uploadedBy: item.uploadedBy || null
        }
    })
}
