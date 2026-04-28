import { z } from 'zod'
import { Op } from 'sequelize'
import { Appointment, Dentist, Patient, User } from '../models/index.js'
import { getAvailabilityForDate, hasCollision, isBlocked } from '../services/appointments.service.js'
import { sequelize } from '../db/sequelize.js'
import {
    findScopedAppointmentById,
    findScopedDentistById,
    findScopedDentistByUserId,
    findScopedPatientByEmail,
    findScopedPatientById,
    scopedPatientInclude,
    scopedUserInclude
} from '../utils/clinicScope.js'
import { sanitizeDentistSummary, sanitizePatientSummary } from '../utils/sanitizers.js'

const serializeAppointment = (appointment) => {
    const json = appointment?.toJSON ? appointment.toJSON() : { ...appointment }
    const { Dentist, Patient, ...rest } = json
    return {
        ...rest,
        dentist: Dentist ? sanitizeDentistSummary(Dentist) : undefined,
        patient: Patient ? sanitizePatientSummary(Patient) : undefined
    }
}

export const getAvailability = async (req, res) => {
    const dentistId = Number(req.query.dentistId)
    const date = String(req.query.date || '') // "YYYY-MM-DD"
    if (!dentistId || !date) return res.status(400).json({ message: 'dentistId y date son requeridos' })

    const dentist = await findScopedDentistById(req.clinicId, dentistId)
    if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })

    const d = new Date(`${date}T00:00:00`)
    const weekday = d.getDay() // 0-6
    const slots = await getAvailabilityForDate({ dentistId, dateISO: date, weekday })

    res.json({ dentistId, date, weekday, slots })
}

const createAppointmentSchema = z.object({
    dentistId: z.number().int().positive(),
    patientId: z.number().int().positive(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().max(200).optional()
})

const getWeekRange = (date) => {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const day = start.getDay()
    const diff = (day + 6) % 7
    start.setDate(start.getDate() - diff)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start, end }
}

export const createAppointment = async (req, res) => {
    const data = createAppointmentSchema.parse(req.body)

    const startAt = new Date(data.startAt)
    const endAt = new Date(data.endAt)

    if (!(startAt < endAt)) return res.status(400).json({ message: 'Rango horario invalido' })

    const dentist = await findScopedDentistById(req.clinicId, data.dentistId)
    if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })

    const patient = await findScopedPatientById(req.clinicId, data.patientId)
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    if (req.user.role === 'ODONTOLOGO') {
        const ownDentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
        if (!ownDentist || ownDentist.id !== data.dentistId) {
            return res.status(403).json({ message: 'No puedes crear turnos para otro odontologo' })
        }
    }

    if (req.user.role === 'PACIENTE') {
        if (patient.email !== req.user.email) {
            return res.status(403).json({ message: 'No puedes crear turnos para otro paciente' })
        }
    }

    if (await isBlocked({ dentistId: data.dentistId, startAt, endAt })) {
        return res.status(409).json({ message: 'Horario bloqueado' })
    }

    if (await hasCollision({ dentistId: data.dentistId, startAt, endAt })) {
        return res.status(409).json({ message: 'Turno ya ocupado' })
    }

    const week = getWeekRange(startAt)
    const createdByRole = req.user.role === 'PACIENTE' ? 'PACIENTE' : req.user.role
    let appt = null

    await sequelize.transaction(async (transaction) => {
        const lockedDentist = await Dentist.findOne({
            where: { id: data.dentistId },
            include: [{ model: User, where: { clinicId: req.clinicId }, attributes: [], required: true }],
            transaction,
            lock: transaction.LOCK.UPDATE
        })
        if (!lockedDentist) {
            const err = new Error('Dentista no encontrado')
            err.status = 404
            throw err
        }

        if (await isBlocked({ dentistId: data.dentistId, startAt, endAt, transaction })) {
            const err = new Error('Horario bloqueado')
            err.status = 409
            throw err
        }

        if (await hasCollision({ dentistId: data.dentistId, startAt, endAt, transaction })) {
            const err = new Error('Turno ya ocupado')
            err.status = 409
            throw err
        }

        const existingWeek = await Appointment.findOne({
            where: {
                patientId: data.patientId,
                startAt: { [Op.gte]: week.start, [Op.lt]: week.end },
                status: { [Op.ne]: 'CANCELADO' }
            },
            transaction
        })
        if (existingWeek) {
            const err = new Error('El paciente ya tiene un turno en esta semana')
            err.status = 409
            throw err
        }

        appt = await Appointment.create({
            dentistId: data.dentistId,
            patientId: data.patientId,
            startAt,
            endAt,
            reason: data.reason || null,
            createdByRole
        }, { transaction })
    }).catch((err) => {
        if (err?.status === 404 || err?.status === 409) {
            return res.status(err.status).json({ message: err.message })
        }
        throw err
    })

    if (res.headersSent) return

    res.status(201).json({ appointment: serializeAppointment(appt) })
}

export const myAppointments = async (req, res) => {
    const where = {}
    if (req.user.role === 'PACIENTE') {
        const patient = await findScopedPatientByEmail(req.clinicId, req.user.email)
        if (!patient) return res.json({ appointments: [] })
        where.patientId = patient.id
    } else if (req.user.role === 'ODONTOLOGO') {
        const dentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
        if (!dentist) return res.json({ appointments: [] })
        where.dentistId = dentist.id
    } else if (req.user.role === 'RECEPCION' || req.user.role === 'ADMIN') {
        // recepcion/admin ven todos dentro de su clinica
    } else {
        return res.status(403).json({ message: 'Rol sin turnos asociados' })
    }

    const appointments = await Appointment.findAll({
        where,
        order: [['startAt', 'ASC']],
        include: [
            { model: Dentist, include: [scopedUserInclude(req.clinicId, [])], required: true },
            scopedPatientInclude(req.clinicId)
        ]
    })

    const serialized = appointments.map((a) => {
        return serializeAppointment(a)
    })

    res.json({ appointments: serialized })
}

export const cancelAppointment = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const appt = await findScopedAppointmentById(req.clinicId, id)
    if (!appt) return res.status(404).json({ message: 'Turno no encontrado' })

    if (req.user.role === 'PACIENTE') {
        const patient = await findScopedPatientByEmail(req.clinicId, req.user.email)
        if (!patient || patient.id !== appt.patientId) {
            return res.status(403).json({ message: 'No puedes cancelar este turno' })
        }
    }

    if (req.user.role === 'ODONTOLOGO') {
        const dentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
        if (!dentist || dentist.id !== appt.dentistId) {
            return res.status(403).json({ message: 'No puedes cancelar este turno' })
        }
    }

    appt.status = 'CANCELADO'
    await appt.save()

    res.json({ appointment: serializeAppointment(appt) })
}

const statusSchema = z.object({
    status: z.enum(['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'ASISTIO', 'NO_ASISTIO'])
})

export const updateStatus = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const appt = await findScopedAppointmentById(req.clinicId, id)
    if (!appt) return res.status(404).json({ message: 'Turno no encontrado' })

    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Estado invalido', errors: parsed.error.errors })

    if (req.user.role === 'ODONTOLOGO') {
        const dentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
        if (!dentist || dentist.id !== appt.dentistId) {
            return res.status(403).json({ message: 'No puedes modificar este turno' })
        }
    }

    appt.status = parsed.data.status
    await appt.save()

    res.json({ appointment: serializeAppointment(appt) })
}

const rescheduleSchema = z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().max(200).optional()
})

export const rescheduleAppointment = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const appt = await findScopedAppointmentById(req.clinicId, id)
    if (!appt) return res.status(404).json({ message: 'Turno no encontrado' })

    const parsed = rescheduleSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })

    if (req.user.role === 'ODONTOLOGO') {
        const dentist = await findScopedDentistByUserId(req.clinicId, req.user.id)
        if (!dentist || dentist.id !== appt.dentistId) {
            return res.status(403).json({ message: 'No puedes modificar este turno' })
        }
    }

    const startAt = new Date(parsed.data.startAt)
    const endAt = new Date(parsed.data.endAt)
    if (!(startAt < endAt)) return res.status(400).json({ message: 'Rango horario invalido' })

    if (await isBlocked({ dentistId: appt.dentistId, startAt, endAt })) {
        return res.status(409).json({ message: 'Horario bloqueado' })
    }
    if (await hasCollision({ dentistId: appt.dentistId, startAt, endAt, excludeAppointmentId: appt.id })) {
        return res.status(409).json({ message: 'Turno ya ocupado' })
    }

    const week = getWeekRange(startAt)
    let updatedAppt = null

    await sequelize.transaction(async (transaction) => {
        const lockedDentist = await Dentist.findOne({
            where: { id: appt.dentistId },
            include: [{ model: User, where: { clinicId: req.clinicId }, attributes: [], required: true }],
            transaction,
            lock: transaction.LOCK.UPDATE
        })
        if (!lockedDentist) {
            const err = new Error('Dentista no encontrado')
            err.status = 404
            throw err
        }

        const lockedAppt = await Appointment.findByPk(appt.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        })
        if (!lockedAppt) {
            const err = new Error('Turno no encontrado')
            err.status = 404
            throw err
        }

        if (await isBlocked({ dentistId: lockedAppt.dentistId, startAt, endAt, transaction })) {
            const err = new Error('Horario bloqueado')
            err.status = 409
            throw err
        }

        if (await hasCollision({
            dentistId: lockedAppt.dentistId,
            startAt,
            endAt,
            excludeAppointmentId: lockedAppt.id,
            transaction
        })) {
            const err = new Error('Turno ya ocupado')
            err.status = 409
            throw err
        }

        const existingWeek = await Appointment.findOne({
            where: {
                id: { [Op.ne]: lockedAppt.id },
                patientId: lockedAppt.patientId,
                startAt: { [Op.gte]: week.start, [Op.lt]: week.end },
                status: { [Op.ne]: 'CANCELADO' }
            },
            transaction
        })
        if (existingWeek) {
            const err = new Error('El paciente ya tiene un turno en esta semana')
            err.status = 409
            throw err
        }

        lockedAppt.startAt = startAt
        lockedAppt.endAt = endAt
        if (parsed.data.reason !== undefined) {
            lockedAppt.reason = parsed.data.reason || null
        }
        lockedAppt.status = 'CONFIRMADO'
        await lockedAppt.save({ transaction })
        updatedAppt = lockedAppt
    }).catch((err) => {
        if (err?.status === 409 || err?.status === 404) {
            return res.status(err.status).json({ message: err.message })
        }
        throw err
    })

    if (res.headersSent) return

    res.json({ appointment: serializeAppointment(updatedAppt) })
}
