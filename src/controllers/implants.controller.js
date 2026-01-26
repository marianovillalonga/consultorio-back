import { Implant, Patient } from '../models/index.js'
import { sequelize } from '../db/sequelize.js'
import { z } from 'zod'

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

const nullishToUndefined = (value) => {
  if (value === null || value === undefined || value === '') return undefined
  return value
}

const optionalString = (max) =>
  z.preprocess(
    nullishToUndefined,
    z.union([max ? z.string().max(max) : z.string(), z.undefined(), z.null()])
  )

const optionalEnum = (values) =>
  z.preprocess(nullishToUndefined, z.union([z.enum(values), z.undefined(), z.null()]))

const optionalInt = () =>
  z.preprocess(nullishToUndefined, z.union([z.number().int(), z.undefined(), z.null()]))

const optionalObject = (schema) =>
  z.preprocess(nullishToUndefined, z.union([schema, z.undefined(), z.null()]))

const numberField = (min, max) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === '') return undefined
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.'))
        return Number.isNaN(parsed) ? value : parsed
      }
      return value
    },
    z.union([z.number().min(min).max(max), z.undefined(), z.null()])
  )

const pieceSchema = z
  .string()
  .regex(/^(1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])$/, 'Pieza invalida')

const planningSchema = z
  .object({
    plannedAt: optionalString(40),
    maxillary: optionalEnum(['SUP', 'INF']),
    implantType: optionalString(120),
    length: numberField(6, 18),
    diameter: numberField(3, 6),
    brand: optionalString(120),
    model: optionalString(120),
    technique: optionalEnum(['CONVENCIONAL', 'GUIADA']),
    location: optionalEnum(['ANTERIOR', 'POSTERIOR']),
    prostheticObjective: optionalEnum(['UNITARIO', 'PUENTE', 'TOTAL']),
    regeneration: z
      .object({
        injerto: z.boolean().optional(),
        elevacionSeno: z.boolean().optional(),
        rog: z.boolean().optional(),
        notes: optionalString(2000)
      })
      .optional(),
    notes: optionalString(4000),
    responsibleUserId: optionalInt(),
    files: studyFilesSchema.optional(),
    consent: z
      .object({
        accepted: z.boolean().optional(),
        date: optionalString(40),
        fileId: optionalString(80)
      })
      .optional()
  })
  .passthrough()

const surgerySchema = z
  .object({
    date: optionalString(40),
    torque: numberField(10, 60),
    loadType: optionalEnum(['INMEDIATA', 'DIFERIDA']),
    medication: optionalString(300),
    surgeryType: optionalString(120),
    lotNumber: optionalString(120),
    serialNumber: optionalString(120),
    incidents: optionalString(1000),
    notes: optionalString(4000),
    files: studyFilesSchema.optional()
  })
  .passthrough()

const osteointegrationSchema = z
  .object({
    controls: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            date: z.string().min(1).max(40),
            status: z.string().max(120).optional(),
            notes: z.string().max(2000).optional(),
            createdAt: z.string().max(40).optional(),
            controlType: z.enum(['OSTEOINTEGRACION', 'SEGUIMIENTO']).optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough()

const prosthesisSchema = z
  .object({
    type: optionalString(120),
    abutmentType: optionalEnum(['CICATRIZADOR', 'TRANSEPITELIAL', 'DEFINITIVO']),
    retention: optionalEnum(['ATORNILLADA', 'CEMENTADA']),
    material: optionalString(120),
    lab: optionalString(160),
    placedAt: optionalString(40),
    provisionalAt: optionalString(40),
    definitiveAt: optionalString(40),
    adjustments: optionalString(2000),
    notes: optionalString(4000),
    files: studyFilesSchema.optional()
  })
  .passthrough()

const followupsSchema = z
  .object({
    controls: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            date: z.string().min(1).max(40),
            status: z.string().max(120).optional(),
            notes: z.string().max(2000).optional(),
            createdAt: z.string().max(40).optional(),
            controlType: z.enum(['OSTEOINTEGRACION', 'SEGUIMIENTO']).optional()
          })
          .passthrough()
      )
      .optional(),
    files: studyFilesSchema.optional()
  })
  .passthrough()

const baseImplantSchema = {
  piece: pieceSchema,
  maxillary: optionalEnum(['SUP', 'INF']),
  status: optionalEnum(['PLANIFICADO', 'COLOCADO', 'OSTEOINTEGRACION', 'PROTESIS', 'CONTROL', 'FALLIDO', 'RETIRADO']),
  implantType: optionalString(120),
  length: numberField(6, 18),
  diameter: numberField(3, 6),
  brand: optionalString(120),
  model: optionalString(120),
  technique: optionalEnum(['CONVENCIONAL', 'GUIADA']),
  notes: optionalString(4000),
  responsibleUserId: optionalInt(),
  createdByUserId: optionalInt(),
  updatedByUserId: optionalInt(),
  statusHistory: z
    .array(
      z.object({
        from: z.string().max(40).optional(),
        to: z.string().max(40).optional(),
        at: z.string().max(40),
        reason: z.string().max(200).optional(),
        reasonCode: z.string().max(80).optional(),
        reasonText: z.string().max(200).optional(),
        oldStatus: z.string().max(40).optional(),
        newStatus: z.string().max(40).optional(),
        controlId: z.string().max(80).optional(),
        source: z.string().max(40).optional()
      })
    )
    .optional(),
  planning: optionalObject(planningSchema),
  surgery: optionalObject(surgerySchema),
  osteointegration: optionalObject(osteointegrationSchema),
  prosthesis: optionalObject(prosthesisSchema),
  followups: optionalObject(followupsSchema)
}

const createImplantSchema = z.object({
  ...baseImplantSchema,
  piece: baseImplantSchema.piece
})

const updateImplantSchema = z.object({
  ...baseImplantSchema,
  piece: baseImplantSchema.piece.optional()
})

const stripFileData = (files = []) =>
  files.map((item) => ({
    id: item.id,
    name: item.name,
    mime: item.mime,
    description: item.description || '',
    createdAt: item.createdAt,
    uploadedBy: item.uploadedBy || null
  }))

const stripImplantFiles = (implant) => {
  const json = implant.toJSON ? implant.toJSON() : { ...implant }
  const planning = json.planning || null
  const surgery = json.surgery || null
  const followups = json.followups || null
  const prosthesis = json.prosthesis || null
  if (planning && Array.isArray(planning.files)) {
    json.planning = { ...planning, files: stripFileData(planning.files) }
  }
  if (surgery && Array.isArray(surgery.files)) {
    json.surgery = { ...surgery, files: stripFileData(surgery.files) }
  }
  if (followups && Array.isArray(followups.files)) {
    json.followups = { ...followups, files: stripFileData(followups.files) }
  }
  if (prosthesis && Array.isArray(prosthesis.files)) {
    json.prosthesis = { ...prosthesis, files: stripFileData(prosthesis.files) }
  }
  return json
}

const normalizeIsoDate = (value, fallback) => {
  const date = value ? new Date(value) : null
  if (date && !Number.isNaN(date.getTime())) return date.toISOString()
  return fallback || new Date().toISOString()
}

const mergeFiles = (incoming = [], existing = [], userId) => {
  const existingMap = new Map(existing.map((item) => [item.id, item]))
  const merged = []
  for (const item of incoming) {
    const prev = existingMap.get(item.id)
    const data = item.data && item.data.length > 0 ? item.data : prev?.data
    if (!data) {
      return { ok: false, error: `Falta data para el archivo ${item.name}` }
    }
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
  return { ok: true, value: merged }
}

const mergeImplantFiles = (payload, existing, userId) => {
  const next = { ...payload }
  if (payload.planning && Array.isArray(payload.planning.files)) {
    const prevFiles = Array.isArray(existing?.planning?.files) ? existing.planning.files : []
    const merged = mergeFiles(payload.planning.files, prevFiles, userId)
    if (!merged.ok) return merged
    next.planning = { ...(payload.planning || {}), files: merged.value }
  }
  if (payload.surgery && Array.isArray(payload.surgery.files)) {
    const prevFiles = Array.isArray(existing?.surgery?.files) ? existing.surgery.files : []
    const merged = mergeFiles(payload.surgery.files, prevFiles, userId)
    if (!merged.ok) return merged
    next.surgery = { ...(payload.surgery || {}), files: merged.value }
  }
  if (payload.followups && Array.isArray(payload.followups.files)) {
    const prevFiles = Array.isArray(existing?.followups?.files) ? existing.followups.files : []
    const merged = mergeFiles(payload.followups.files, prevFiles, userId)
    if (!merged.ok) return merged
    next.followups = { ...(payload.followups || {}), files: merged.value }
  }
  if (payload.prosthesis && Array.isArray(payload.prosthesis.files)) {
    const prevFiles = Array.isArray(existing?.prosthesis?.files) ? existing.prosthesis.files : []
    const merged = mergeFiles(payload.prosthesis.files, prevFiles, userId)
    if (!merged.ok) return merged
    next.prosthesis = { ...(payload.prosthesis || {}), files: merged.value }
  }
  return { ok: true, value: next }
}

const findFileById = (implant, fileId) => {
  const planningFiles = implant?.planning?.files || []
  const surgeryFiles = implant?.surgery?.files || []
  const followupFiles = implant?.followups?.files || []
  const prosthesisFiles = implant?.prosthesis?.files || []
  const all = [...planningFiles, ...surgeryFiles, ...followupFiles, ...prosthesisFiles]
  return all.find((f) => f.id === fileId) || null
}

const STATUS_RANK = {
  FALLIDO: 6,
  RETIRADO: 6,
  PROTESIS: 5,
  OSTEOINTEGRACION: 4,
  COLOCADO: 3,
  CONTROL: 2,
  PLANIFICADO: 1
}

const TERMINAL_STATUSES = new Set(['FALLIDO', 'RETIRADO', 'PROTESIS'])

const normalizeControls = (controls = []) =>
  (Array.isArray(controls) ? controls : []).map((control) => ({
    ...control,
    createdAt: control.createdAt || new Date().toISOString()
  }))

const compareControlDates = (a, b) => {
  const dateA = String(a.date || '')
  const dateB = String(b.date || '')
  if (dateA !== dateB) return dateB.localeCompare(dateA)
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
}

const deriveStatusFromControls = (controls = []) => {
  if (!Array.isArray(controls) || controls.length === 0) return null
  const sorted = [...controls].sort(compareControlDates)
  const latest = sorted[0]
  const raw = String(latest?.status || '').toLowerCase()
  if (!raw) return null
  const base = { controlId: latest.id || null, controlDate: latest.date || null }
  if (raw.includes('fall'))
    return { ...base, key: 'FALLIDO', reasonCode: 'CONTROL_FALLA', reasonText: latest.status || '' }
  if (raw.includes('retir'))
    return { ...base, key: 'RETIRADO', reasonCode: 'CONTROL_RETIRO', reasonText: latest.status || '' }
  if (raw.includes('protesis'))
    return { ...base, key: 'PROTESIS', reasonCode: 'CONTROL_PROTESIS', reasonText: latest.status || '' }
  if (raw.includes('integrado') || raw.includes('osteo') || raw.includes('oseo')) {
    return { ...base, key: 'OSTEOINTEGRACION', reasonCode: 'CONTROL_INTEGRADO', reasonText: latest.status || '' }
  }
  if (raw.includes('ok') || raw.includes('control'))
    return { ...base, key: 'CONTROL', reasonCode: 'CONTROL_OK', reasonText: latest.status || '' }
  return null
}

export const listPatientImplants = async (req, res) => {
  const patientId = Number(req.params.id)
  if (!patientId) return res.status(400).json({ message: 'ID requerido' })

  const patient = await Patient.findByPk(patientId)
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

  const implants = await Implant.findAll({
    where: { patientId },
    order: [['createdAt', 'DESC']]
  })
  const serialized = implants.map((i) => stripImplantFiles(i))
  res.json({ implants: serialized })
}

export const getPatientImplant = async (req, res) => {
  const patientId = Number(req.params.id)
  const implantId = Number(req.params.implantId)
  if (!patientId || !implantId) return res.status(400).json({ message: 'Parametros invalidos' })

  const implant = await Implant.findByPk(implantId)
  if (!implant || implant.patientId !== patientId) return res.status(404).json({ message: 'Implante no encontrado' })

  res.json({ implant: stripImplantFiles(implant) })
}

export const createPatientImplant = async (req, res) => {
  const patientId = Number(req.params.id)
  if (!patientId) return res.status(400).json({ message: 'ID requerido' })

  const patient = await Patient.findByPk(patientId)
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

  const parsed = createImplantSchema.safeParse(req.body)
  if (!parsed.success) {
    console.error('[implants.create] Datos invalidos', parsed.error)
    console.error('[implants.create] Issues', parsed.error?.issues)
    return res.status(400).json({
      message: 'Datos invalidos',
      errors: parsed.error?.issues || parsed.error?.errors
    })
  }

  const payload = { ...parsed.data, patientId }
  payload.createdByUserId = payload.createdByUserId || req.user?.id || null
  payload.updatedByUserId = payload.updatedByUserId || req.user?.id || null
  const merged = mergeImplantFiles(payload, null, req.user?.id)
  if (!merged.ok) return res.status(400).json({ message: merged.error })

  const implant = await Implant.create(merged.value)
  res.status(201).json({ implant: stripImplantFiles(implant) })
}

export const updatePatientImplant = async (req, res) => {
  const patientId = Number(req.params.id)
  const implantId = Number(req.params.implantId)
  if (!patientId || !implantId) return res.status(400).json({ message: 'Parametros invalidos' })

  const implant = await Implant.findByPk(implantId)
  if (!implant || implant.patientId !== patientId) return res.status(404).json({ message: 'Implante no encontrado' })

  const parsed = updateImplantSchema.safeParse(req.body)
  if (!parsed.success) {
    console.error('[implants.update] Datos invalidos', parsed.error)
    console.error('[implants.update] Issues', parsed.error?.issues)
    return res.status(400).json({
      message: 'Datos invalidos',
      errors: parsed.error?.issues || parsed.error?.errors
    })
  }

  const merged = mergeImplantFiles(parsed.data, implant.toJSON(), req.user?.id)
  if (!merged.ok) return res.status(400).json({ message: merged.error })

  try {
    await sequelize.transaction(async (t) => {
      const fresh = await Implant.findByPk(implantId, { transaction: t, lock: t.LOCK.UPDATE })
      if (!fresh || fresh.patientId !== patientId) {
        res.status(404).json({ message: 'Implante no encontrado' })
        return
      }
      const existing = fresh.toJSON()
      const updatePayload = { ...merged.value, updatedByUserId: req.user?.id || existing.updatedByUserId || null }

      const incomingHasOsteoControls =
        parsed.data?.osteointegration && Array.isArray(parsed.data.osteointegration.controls)
      if (incomingHasOsteoControls && !parsed.data?.status) {
        const osteoControls = normalizeControls(updatePayload.osteointegration?.controls || existing.osteointegration?.controls || [])
          .map((control) => ({
            ...control,
            controlType: control.controlType || 'OSTEOINTEGRACION'
          }))
          .filter((control) => control.controlType === 'OSTEOINTEGRACION')
        const suggestion = deriveStatusFromControls(osteoControls)
        if (suggestion) {
          const current = existing.status || 'PLANIFICADO'
          const currentRank = STATUS_RANK[current] || 0
          const nextRank = STATUS_RANK[suggestion.key] || 0
          const canAdvance = nextRank > currentRank
          const isTerminal = TERMINAL_STATUSES.has(current)
          if (canAdvance && !isTerminal) {
            updatePayload.status = suggestion.key
            const history = Array.isArray(existing.statusHistory) ? [...existing.statusHistory] : []
            history.push({
              oldStatus: current,
              newStatus: suggestion.key,
              from: current,
              to: suggestion.key,
              at: new Date().toISOString(),
              reasonCode: suggestion.reasonCode,
              reasonText: suggestion.reasonText || '',
              controlId: suggestion.controlId || null,
              source: 'auto'
            })
            updatePayload.statusHistory = history
          }
        }
      }

      await fresh.update(updatePayload, { transaction: t })
      res.json({ implant: stripImplantFiles(fresh) })
    })
  } catch (err) {
    console.error('[implants.update] Error al actualizar', err)
    res.status(500).json({ message: err?.message || 'No se pudo actualizar el implante' })
  }
}

export const deletePatientImplant = async (req, res) => {
  const patientId = Number(req.params.id)
  const implantId = Number(req.params.implantId)
  if (!patientId || !implantId) return res.status(400).json({ message: 'Parametros invalidos' })

  const implant = await Implant.findByPk(implantId)
  if (!implant || implant.patientId !== patientId) return res.status(404).json({ message: 'Implante no encontrado' })

  await implant.destroy()
  res.json({ ok: true })
}

export const getPatientImplantFile = async (req, res) => {
  const patientId = Number(req.params.id)
  const implantId = Number(req.params.implantId)
  const fileId = String(req.params.fileId || '')
  if (!patientId || !implantId || !fileId) return res.status(400).json({ message: 'Parametros invalidos' })

  const implant = await Implant.findByPk(implantId)
  if (!implant || implant.patientId !== patientId) return res.status(404).json({ message: 'Implante no encontrado' })

  const file = findFileById(implant.toJSON(), fileId)
  if (!file || !file.data) return res.status(404).json({ message: 'Archivo no encontrado' })

  res.json({
    file: {
      id: file.id,
      name: file.name,
      mime: file.mime,
      data: file.data,
      description: file.description || '',
      createdAt: file.createdAt,
      uploadedBy: file.uploadedBy || null
    }
  })
}
