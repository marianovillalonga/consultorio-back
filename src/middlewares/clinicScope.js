export const requireClinicScope = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' })
    }

    const clinicId = Number(req.user.clinicId)
    if (!Number.isInteger(clinicId) || clinicId <= 0) {
        return res.status(403).json({ message: 'Usuario sin clinica valida' })
    }

    req.clinicId = clinicId
    next()
}
