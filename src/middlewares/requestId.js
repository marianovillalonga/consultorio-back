import { randomUUID } from 'crypto'
import logger from '../lib/logger.js'

export const requestIdMiddleware = (req, res, next) => {
    const requestId = randomUUID()
    req.id = requestId
    req.requestId = requestId
    req.log = logger.child({ requestId })
    res.setHeader('X-Request-Id', requestId)
    next()
}
