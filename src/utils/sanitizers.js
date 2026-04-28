const normalizeSpecialties = (value, fallbackSpecialty) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean)
    }

    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item).trim()).filter(Boolean)
            }
        } catch {
            return value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
        }
    }

    if (fallbackSpecialty) return [String(fallbackSpecialty).trim()].filter(Boolean)
    return []
}

const dentistJson = (dentist) => (dentist?.toJSON ? dentist.toJSON() : { ...dentist })
const userJson = (user) => (user?.toJSON ? user.toJSON() : { ...user })
const patientJson = (patient) => (patient?.toJSON ? patient.toJSON() : { ...patient })
const sessionUserJson = (user) => (user?.toJSON ? user.toJSON() : { ...user })

export const sanitizeDentistSummary = (dentist) => {
    const json = dentistJson(dentist)
    return {
        id: json.id,
        fullName: json.fullName || null,
        photoUrl: json.photoUrl || null,
        bio: json.bio || null,
        specialties: normalizeSpecialties(json.specialties, json.specialty),
        specialty: json.specialty || null,
        license: json.license || null
    }
}

export const sanitizeDentistProfile = (dentist) => {
    const summary = sanitizeDentistSummary(dentist)
    return {
        ...summary,
        canEditProfile: true
    }
}

export const sanitizeAdminUser = (user) => {
    const json = userJson(user)
    return {
        id: json.id,
        email: json.email,
        active: json.active,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt
    }
}

export const sanitizePatientProfile = (patient) => {
    const json = patientJson(patient)
    return {
        id: json.id,
        fullName: json.fullName,
        dni: json.dni || null,
        phone: json.phone || null,
        email: json.email || null
    }
}

export const sanitizePatientSummary = (patient) => {
    const json = patientJson(patient)
    return {
        id: json.id,
        fullName: json.fullName || null
    }
}

export const sanitizeSessionUser = (user) => {
    const json = sessionUserJson(user)
    return {
        id: json.id,
        role: json.role,
        email: json.email
    }
}
