import { Appointment, Patient } from '../models/index.js'
import { Op } from 'sequelize'
import { scopedPatientInclude } from '../utils/clinicScope.js'

const toDate = (value, endOfDay = false) => {
    if (!value) return null
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return null
    if (endOfDay) {
        d.setHours(23, 59, 59, 999)
    } else {
        d.setHours(0, 0, 0, 0)
    }
    return d
}

const daysBetween = (start, end) => {
    const ms = Math.max(1, end.getTime() - start.getTime())
    return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export const adminMetrics = async (req, res) => {
    const { start, end } = req.query
    const startDate = toDate(start) || toDate(new Date().toISOString().slice(0, 10))
    const endDate = toDate(end, true) || toDate(new Date().toISOString().slice(0, 10), true)

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Fechas invalidas' })
    }

    const appointmentWhere = {
        startAt: { [Op.gte]: startDate, [Op.lte]: endDate }
    }

    const appointmentScope = {
        include: [scopedPatientInclude(req.clinicId, [])],
        distinct: true,
        col: 'Appointment.id'
    }

    const totalAppointments = await Appointment.count({ where: appointmentWhere, ...appointmentScope })
    const canceledAppointments = await Appointment.count({
        where: { ...appointmentWhere, status: 'CANCELADO' },
        ...appointmentScope
    })
    const attendedAppointments = await Appointment.count({
        where: { ...appointmentWhere, status: 'ASISTIO' },
        ...appointmentScope
    })
    const noShowAppointments = await Appointment.count({
        where: { ...appointmentWhere, status: 'NO_ASISTIO' },
        ...appointmentScope
    })

    const createdWhere = {
        createdAt: { [Op.gte]: startDate, [Op.lte]: endDate }
    }
    const createdAppointments = await Appointment.count({ where: createdWhere, ...appointmentScope })
    const newPatients = await Patient.count({ where: { ...createdWhere, clinicId: req.clinicId } })

    const totalDays = daysBetween(startDate, endDate)
    const occupancyRate = totalAppointments ? (attendedAppointments / totalAppointments) * 100 : 0
    const cancellationRate = totalAppointments ? (canceledAppointments / totalAppointments) * 100 : 0

    res.json({
        range: { start: startDate.toISOString(), end: endDate.toISOString() },
        totals: {
            totalAppointments,
            createdAppointments,
            canceledAppointments,
            attendedAppointments,
            noShowAppointments,
            newPatients,
            occupancyRate,
            cancellationRate,
            averageAppointmentsPerDay: totalAppointments / totalDays
        }
    })
}
