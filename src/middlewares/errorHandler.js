import { ZodError } from 'zod'

export const createErrorHandler = ({ metrics } = {}) => (err, req, res, next) => {
    if (res.headersSent) return next(err)

    if (metrics) {
        metrics.totalErrors += 1
    }

    const isCorsError = err?.message === 'Not allowed by CORS'
    const isZodError = err instanceof ZodError
    const status = isCorsError ? 403 : isZodError ? 400 : Number(err?.status || err?.statusCode || 500)
    const isControlled = status >= 400 && status < 500

    req.log?.error('request_error', {
        status,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id || null,
        clinicId: req.user?.clinicId || req.clinicId || null,
        error: err
    })

    if (isCorsError) {
        return res.status(403).json({ message: 'CORS: origin no permitido', requestId: req.requestId || req.id })
    }

    if (isZodError) {
        return res.status(400).json({
            message: 'Datos invalidos',
            errors: err.issues,
            requestId: req.requestId || req.id
        })
    }

    if (isControlled) {
        return res.status(status).json({
            message: err?.message || 'Solicitud invalida',
            requestId: req.requestId || req.id
        })
    }

    return res.status(500).json({
        message: 'Error interno del servidor',
        requestId: req.requestId || req.id
    })
}
