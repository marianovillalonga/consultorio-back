export const createHttpLoggerMiddleware = ({ metrics } = {}) => (req, res, next) => {
    const startedAt = Date.now()

    res.on('finish', () => {
        const durationMs = Date.now() - startedAt
        if (metrics) {
            metrics.totalRequests += 1
            metrics.statusCounts[res.statusCode] = (metrics.statusCounts[res.statusCode] || 0) + 1
        }

        req.log?.info('http_request', {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs,
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
            userId: req.user?.id || null,
            clinicId: req.user?.clinicId || req.clinicId || null,
            headers: req.headers
        })
    })

    next()
}
