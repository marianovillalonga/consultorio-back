import { Op } from 'sequelize'
import { Appointment, Block, Availability } from '../models/index.js'

export const hasCollision = async ({ dentistId, startAt, endAt, excludeAppointmentId, transaction }) => {
    const where = {
        dentistId,
        status: { [Op.ne]: 'CANCELADO' },
        startAt: { [Op.lt]: endAt },
        endAt: { [Op.gt]: startAt }
    }
    if (excludeAppointmentId) {
        where.id = { [Op.ne]: excludeAppointmentId }
    }

    const collision = await Appointment.findOne({
        where,
        transaction
    })
    return Boolean(collision)
}

export const isBlocked = async ({ dentistId, startAt, endAt, transaction }) => {
    const block = await Block.findOne({
        where: {
        dentistId,
        fromDateTime: { [Op.lt]: endAt },
        toDateTime: { [Op.gt]: startAt }
        },
        transaction
    })
    return Boolean(block)
}

const fixedSchedule = [
    { from: '08:30', to: '09:30' },
    { from: '09:30', to: '10:30' },
    { from: '10:30', to: '11:30' },
    { from: '11:30', to: '12:30' },
    { from: '16:30', to: '17:30' },
    { from: '17:30', to: '18:30' },
    { from: '18:30', to: '19:30' },
    { from: '19:30', to: '20:30' }
]

const buildFixedSlots = ({ dateISO }) => {
    return fixedSchedule.map(({ from, to }) => ({
        startAt: new Date(`${dateISO}T${from}:00`).toISOString(),
        endAt: new Date(`${dateISO}T${to}:00`).toISOString()
    }))
}

export const buildDailySlots = ({ dateISO, availabilityRows, weekday }) => {
    const slots = []

    if (!availabilityRows || availabilityRows.length === 0) {
        // Fijo: lunes a viernes con horarios definidos
        if (weekday >= 1 && weekday <= 5) {
            return buildFixedSlots({ dateISO })
        }
        return slots
    }

    for (const av of availabilityRows) {
        const [fh, fm] = av.fromTime.split(':').map(Number)
        const [th, tm] = av.toTime.split(':').map(Number)
        const slot = av.slotMinutes

        let start = new Date(`${dateISO}T${String(fh).padStart(2,'0')}:${String(fm).padStart(2,'0')}:00`)
        const endLimit = new Date(`${dateISO}T${String(th).padStart(2,'0')}:${String(tm).padStart(2,'0')}:00`)

        while (start < endLimit) {
        const end = new Date(start.getTime() + slot * 60 * 1000)
        if (end <= endLimit) {
            slots.push({ startAt: start.toISOString(), endAt: end.toISOString() })
        }
        start = end
        }
    }

    return slots
}

export const getAvailabilityForDate = async ({ dentistId, dateISO, weekday }) => {
    const availabilityRows = await Availability.findAll({ where: { dentistId, weekday } })
    const slots = buildDailySlots({ dateISO, availabilityRows, weekday })

    const dayStart = new Date(`${dateISO}T00:00:00`)
    const dayEnd = new Date(`${dateISO}T23:59:59.999`)

    const [blocks, appointments] = await Promise.all([
        Block.findAll({
            where: {
                dentistId,
                fromDateTime: { [Op.lt]: dayEnd },
                toDateTime: { [Op.gt]: dayStart }
            }
        }),
        Appointment.findAll({
            where: {
                dentistId,
                status: { [Op.ne]: 'CANCELADO' },
                startAt: { [Op.lt]: dayEnd },
                endAt: { [Op.gt]: dayStart }
            }
        })
    ])

    return slots.map((slot) => {
        const start = new Date(slot.startAt)
        const end = new Date(slot.endAt)
        const blocked = blocks.some((b) => b.fromDateTime < end && b.toDateTime > start)
        const taken = appointments.some((a) => a.startAt < end && a.endAt > start)
        return { ...slot, available: !(blocked || taken) }
    })
}
