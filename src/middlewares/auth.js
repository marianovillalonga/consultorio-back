import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User, UserPermission } from '../models/index.js'

export const authRequired = async (req, res, next) => {
    try {
        const header = req.headers.authorization || ''
        const bearer = header.startsWith('Bearer ') ? header.slice(7) : null
        const cookieToken = req.cookies?.accessToken
        const token = bearer || cookieToken || null
        if (!token) return res.status(401).json({ message: 'Token requerido' })

        const payload = jwt.verify(token, env.jwt.secret)
        const user = await User.findByPk(payload.sub)
        if ((!user || !user.active || !user.activeStatus)) {
            return res.status(401).json({ message: 'Usuario invalido' })
        }
        if (user.clinicId === null || user.clinicId === undefined) {
            return res.status(403).json({ message: 'Usuario sin clinica' })
        }

        req.user = { id: user.id, role: user.role, email: user.email, clinicId: user.clinicId }
        next()
    } catch (e) {
        return res.status(401).json({ message: 'Token invalido' })
    }
}

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'No autenticado' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Sin permisos' })
    next()
}

export const requireViewPermission = (viewKey, access = 'read') => async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'No autenticado' })
    if (req.user.role === 'ADMIN') return next()
    if (req.user.role === 'PACIENTE') {
        if (viewKey === 'TURNOS') return next()
        return res.status(403).json({ message: 'Sin permisos' })
    }
    if (req.user.role !== 'ODONTOLOGO') {
        return res.status(403).json({ message: 'Sin permisos' })
    }

    const perm = await UserPermission.findOne({ where: { userId: req.user.id, viewKey } })
    const canRead = perm?.canRead || perm?.canWrite || false
    const canWrite = perm?.canWrite || false

    if (access === 'write' && !canWrite) {
        return res.status(403).json({ message: 'Sin permiso de escritura' })
    }
    if (access === 'read' && !canRead) {
        return res.status(403).json({ message: 'Sin permiso de lectura' })
    }
    next()
}
