import { z } from 'zod'
import { User, UserPermission } from '../models/index.js'
import { logAudit } from '../services/audit.service.js'

const VIEW_KEYS = ['TURNOS', 'PACIENTES', 'OBRAS_SOCIALES', 'PAGOS']

const permissionSchema = z.object({
    viewKey: z.enum(VIEW_KEYS),
    canRead: z.boolean(),
    canWrite: z.boolean()
})

export const listUserPermissions = async (req, res) => {
    const userId = Number(req.params.id)
    if (!userId) return res.status(400).json({ message: 'ID requerido' })

    const user = await User.findOne({ where: { id: userId, clinicId: req.clinicId } })
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    if (user.role !== 'ODONTOLOGO') {
        return res.status(400).json({ message: 'Solo se pueden ver permisos de odontologos' })
    }

    const rows = await UserPermission.findAll({ where: { userId } })
    res.json({
        permissions: rows.map((p) => ({
            viewKey: p.viewKey,
            canRead: p.canRead,
            canWrite: p.canWrite
        }))
    })
}

export const updateUserPermissions = async (req, res) => {
    const userId = Number(req.params.id)
    if (!userId) return res.status(400).json({ message: 'ID requerido' })

    const user = await User.findOne({ where: { id: userId, clinicId: req.clinicId } })
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    if (user.role !== 'ODONTOLOGO') {
        return res.status(400).json({ message: 'Solo se pueden configurar permisos para odontologos' })
    }

    const parsed = z.array(permissionSchema).safeParse(req.body?.permissions)
    if (!parsed.success) {
        return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    }

    const nextPermissions = parsed.data
    const existing = await UserPermission.findAll({ where: { userId } })
    const existingMap = new Map(existing.map((p) => [p.viewKey, p]))

    for (const perm of nextPermissions) {
        const row = existingMap.get(perm.viewKey)
        if (row) {
            await row.update({ canRead: perm.canRead, canWrite: perm.canWrite })
        } else {
            await UserPermission.create({
                userId,
                viewKey: perm.viewKey,
                canRead: perm.canRead,
                canWrite: perm.canWrite
            })
        }
    }

    await logAudit({ userId: req.user.id, action: 'ADMIN_UPDATE_PERMISSIONS', details: { targetUserId: userId } })
    res.json({ ok: true })
}

export const listViews = (_req, res) => {
    res.json({ views: VIEW_KEYS })
}
