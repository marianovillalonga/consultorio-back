import { AuditLog } from '../models/index.js'

export const logAudit = async ({ userId, action, details }) => {
    try {
        await AuditLog.create({
            userId: userId || null,
            action,
            details: details ? JSON.stringify(details) : null
        })
    } catch {
        // best-effort logging
    }
}
