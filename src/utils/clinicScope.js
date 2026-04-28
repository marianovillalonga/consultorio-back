import { Appointment, Dentist, Patient, User } from '../models/index.js'

export const scopedUserInclude = (clinicId, attributes = []) => ({
    model: User,
    where: { clinicId },
    attributes,
    required: true
})

export const scopedDentistInclude = (clinicId, userAttributes = []) => ({
    model: Dentist,
    required: true,
    include: [scopedUserInclude(clinicId, userAttributes)]
})

export const scopedPatientInclude = (clinicId, attributes = []) => ({
    model: Patient,
    where: { clinicId },
    attributes,
    required: true
})

export const findScopedPatientById = (clinicId, id, options = {}) =>
    Patient.findOne({
        where: { id, clinicId },
        ...options
    })

export const findScopedPatientByEmail = (clinicId, email, options = {}) =>
    Patient.findOne({
        where: { email, clinicId },
        ...options
    })

export const findScopedDentistById = (clinicId, id, userAttributes = [], options = {}) =>
    Dentist.findOne({
        where: { id },
        include: [scopedUserInclude(clinicId, userAttributes)],
        ...options
    })

export const findScopedDentistByUserId = (clinicId, userId, userAttributes = [], options = {}) =>
    Dentist.findOne({
        where: { userId },
        include: [scopedUserInclude(clinicId, userAttributes)],
        ...options
    })

export const findScopedAppointmentById = (clinicId, id, options = {}) =>
    Appointment.findOne({
        where: { id },
        include: [
            scopedPatientInclude(clinicId),
            scopedDentistInclude(clinicId)
        ],
        ...options
    })
