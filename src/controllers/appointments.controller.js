import { z } from 'zod'
import { Op } from 'sequelize'
import { Appointment, Dentist, Patient, User } from '../models/index.js'
import { getAvailabilityForDate, hasCollision, isBlocked } from '../services/appointments.service.js'

export const getAvailability = async (req, res) => {
    const dentistId = Number(req.query.dentistId)
    const date = String(req.query.date || '') // "YYYY-MM-DD"
    if (!dentistId || !date) return res.status(400).json({ message: 'dentistId y date son requeridos' })

    const dentist = await Dentist.findOne({
        where: { id: dentistId },
        include: req.user?.role === 'ADMIN'
            ? [{ model: User, attributes: [] }]
            : [{ model: User, where: { clinicId: req.user?.clinicId }, attributes: [] }]
    })
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

    const dentist = await Dentist.findOne({
        where: { id: data.dentistId },
        include: req.user?.role === 'ADMIN'
            ? [{ model: User, attributes: [] }]
            : [{ model: User, where: { clinicId: req.user?.clinicId }, attributes: [] }]
    })
    if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })

    const patient = req.user?.role === 'ADMIN'
        ? await Patient.findByPk(data.patientId)
        : await Patient.findOne({ where: { id: data.patientId, clinicId: req.user?.clinicId } })
    if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' })

    if (req.user.role === 'ODONTOLOGO') {
        const dentist = await Dentist.findOne({
            where: { userId: req.user.id },
            include: req.user?.role === 'ADMIN'
                ? [{ model: User, attributes: [] }]
                : [{ model: User, where: { clinicId: req.user?.clinicId }, attributes: [] }]
        })
        if (!dentist || dentist.id !== data.dentistId) {
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
    const existingWeek = await Appointment.findOne({
        where: {
            patientId: data.patientId,
            startAt: { [Op.gte]: week.start, [Op.lt]: week.end },
            status: { [Op.ne]: 'CANCELADO' }
        }
    })
    if (existingWeek) {
        return res.status(409).json({ message: 'El paciente ya tiene un turno en esta semana' })
    }

    const createdByRole = req.user.role === 'PACIENTE' ? 'PACIENTE' : req.user.role

    const appt = await Appointment.create({
        dentistId: data.dentistId,
        patientId: data.patientId,
        startAt,
        endAt,
        reason: data.reason || null,
        createdByRole
    })

    res.status(201).json({ appointment: appt })
}

export const myAppointments = async (req, res) => {
    const where = {}
    if (req.user.role === 'PACIENTE') {
        const patient = await Patient.findOne({ where: { email: req.user.email, clinicId: req.user?.clinicId } })
        if (!patient) return res.json({ appointments: [] })
        where.patientId = patient.id
    } else if (req.user.role === 'ODONTOLOGO') {
        const dentist = await Dentist.findOne({
            where: { userId: req.user.id },
            include: [{ model: User, where: { clinicId: req.user?.clinicId }, attributes: [] }]
        })
        if (!dentist) return res.json({ appointments: [] })
        where.dentistId = dentist.id
    } else if (req.user.role === 'ADMIN') {
        // admin ve todos
    } else {
        return res.status(403).json({ message: 'Rol sin turnos asociados' })
    }

    const patientInclude = req.user?.role === 'ADMIN'
        ? { model: Patient }
        : { model: Patient, where: { clinicId: req.user?.clinicId } }

    const appointments = await Appointment.findAll({
        where,
        order: [['startAt', 'ASC']],
        include: [
            { model: Dentist, include: [{ model: User, attributes: ['email', 'role'] }] },
            patientInclude
        ]
    })

    const serialized = appointments.map((a) => {
        const json = a.toJSON()
        return {
            ...json,
            dentist: json.Dentist,
            patient: json.Patient
        }
    })

    res.json({ appointments: serialized })
}

export const cancelAppointment = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const appt = await Appointment.findOne({
        where: { id },
        include: req.user?.role === 'ADMIN'
            ? [{ model: Patient }]
            : [{ model: Patient, where: { clinicId: req.user?.clinicId } }]
    })
    if (!appt) return res.status(404).json({ message: 'Turno no encontrado' })

    if (req.user.role === 'PACIENTE') {
        const patient = await Patient.findOne({ where: { email: req.user.email, clinicId: req.user?.clinicId } })
        if (!patient || patient.id !== appt.patientId) {
            return res.status(403).json({ message: 'No puedes cancelar este turno' })
        }
    }

    if (req.user.role === 'ODONTOLOGO') {
        const dentist = await Dentist.findOne({
            where: { userId: req.user.id },
            include: [{ model: User, where: { clinicId: req.user?.clinicId }, attributes: [] }]
        })
        if (!dentist || dentist.id !== appt.dentistId) {
            return res.status(403).json({ message: 'No puedes cancelar este turno' })
        }
    }

    appt.status = 'CANCELADO'
    await appt.save()

    res.json({ appointment: appt })
}

const statusSchema = z.object({
    status: z.enum(['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'ASISTIO', 'NO_ASISTIO'])
})

export const updateStatus = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const appt = await Appointment.findOne({
        where: { id },
        include: req.user?.role === 'ADMIN'
            ? [{ model: Patient }]
            : [{ model: Patient, where: { clinicId: req.user?.clinicId } }]
    })
    if (!appt) return res.status(404).json({ message: 'Turno no encontrado' })

    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Estado invalido', errors: parsed.error.errors })

    if (req.user.role === 'ODONTOLOGO') {
        const dentist = await Dentist.findOne({
            where: { userId: req.user.id },
            include: [{ model: User, where: { clinicId: req.user?.clinicId }, attributes: [] }]
        })
        if (!dentist || dentist.id !== appt.dentistId) {
            return res.status(403).json({ message: 'No puedes modificar este turno' })
        }
    }

    appt.status = parsed.data.status
    await appt.save()

    res.json({ appointment: appt })
}

const rescheduleSchema = z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().max(200).optional()
})

export const rescheduleAppointment = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })

    const appt = await Appointment.findOne({
        where: { id },
        include: req.user?.role === 'ADMIN'
            ? [{ model: Patient }]
            : [{ model: Patient, where: { clinicId: req.user?.clinicId } }]
    })
    if (!appt) return res.status(404).json({ message: 'Turno no encontrado' })

    const parsed = rescheduleSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })

    if (req.user.role === 'ODONTOLOGO') {
        const dentist = await Dentist.findOne({
            where: { userId: req.user.id },
            include: [{ model: User, where: { clinicId: req.user?.clinicId }, attributes: [] }]
        })
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
    if (await hasCollision({ dentistId: appt.dentistId, startAt, endAt })) {
        return res.status(409).json({ message: 'Turno ya ocupado' })
    }

    const week = getWeekRange(startAt)
    const existingWeek = await Appointment.findOne({
        where: {
            id: { [Op.ne]: appt.id },
            patientId: appt.patientId,
            startAt: { [Op.gte]: week.start, [Op.lt]: week.end },
            status: { [Op.ne]: 'CANCELADO' }
        }
    })
    if (existingWeek) {
        return res.status(409).json({ message: 'El paciente ya tiene un turno en esta semana' })
    }

    appt.startAt = startAt
    appt.endAt = endAt
    if (parsed.data.reason !== undefined) {
        appt.reason = parsed.data.reason || null
    }
    appt.status = 'CONFIRMADO'
    await appt.save()

    res.json({ appointment: appt })
}
