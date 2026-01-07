export const csrfProtect = (req, res, next) => {
    const method = req.method.toUpperCase()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next()
    if (!req.cookies?.accessToken) return next()

    const csrfCookie = req.cookies?.csrfToken
    const csrfHeader = req.headers['x-csrf-token']
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ message: 'CSRF invalido' })
    }
    next()
}
