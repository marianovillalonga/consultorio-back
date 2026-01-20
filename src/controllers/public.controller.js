import { z } from 'zod'
import { Op } from 'sequelize'
import { Appointment, Dentist, Patient } from '../models/index.js'
import { getAvailabilityForDate, hasCollision, isBlocked } from '../services/appointments.service.js'

export const getPublicAvailability = async (req, res) => {
    const dentistId = Number(req.query.dentistId)
    const date = String(req.query.date || '') // "YYYY-MM-DD"
    if (!dentistId || !date) return res.status(400).json({ message: 'dentistId y date son requeridos' })

    const d = new Date(`${date}T00:00:00`)
    const weekday = d.getDay() // 0-6
    const slots = await getAvailabilityForDate({ dentistId, dateISO: date, weekday })

    res.json({ dentistId, date, weekday, slots })
}

const createPublicAppointmentSchema = z.object({
    dentistId: z.number().int().positive(),
    patient: z.object({
        fullName: z.string().min(2).max(150),
        email: z.string().email(),
        phone: z.string().min(5).max(40).optional()
    }),
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

export const createPublicAppointment = async (req, res) => {
    const parsed = createPublicAppointmentSchema.parse(req.body)
    const data = parsed

    const startAt = new Date(data.startAt)
    const endAt = new Date(data.endAt)
    if (!(startAt < endAt)) return res.status(400).json({ message: 'Rango horario invalido' })

    const dentist = await Dentist.findByPk(data.dentistId)
    if (!dentist) return res.status(404).json({ message: 'Dentista no encontrado' })

    let patient = await Patient.findOne({ where: { email: data.patient.email } })
    if (!patient) {
        patient = await Patient.create({
            fullName: data.patient.fullName,
            email: data.patient.email,
            phone: data.patient.phone || null
        })
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
            patientId: patient.id,
            startAt: { [Op.gte]: week.start, [Op.lt]: week.end },
            status: { [Op.ne]: 'CANCELADO' }
        }
    })
    if (existingWeek) {
        return res.status(409).json({ message: 'El paciente ya tiene un turno en esta semana' })
    }

    const appt = await Appointment.create({
        dentistId: data.dentistId,
        patientId: patient.id,
        startAt,
        endAt,
        reason: data.reason || null,
        createdByRole: 'PACIENTE'
    })

    res.status(201).json({ appointment: appt })
}
