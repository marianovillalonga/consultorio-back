import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import swaggerUi from 'swagger-ui-express'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { csrfProtect } from './middlewares/csrf.js'
import { authRequired, requireRole } from './middlewares/auth.js'
import logger from './lib/logger.js'
import { requestIdMiddleware } from './middlewares/requestId.js'
import { createHttpLoggerMiddleware } from './middlewares/httpLogger.js'
import { createErrorHandler } from './middlewares/errorHandler.js'
import routes from './routes/index.js'

const app = express()

app.set('trust proxy', 1)

const whitelist = (env?.cors?.origin || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const isAllowedOrigin = (origin) => {
  if (!origin) return true
  try {
    const url = new URL(origin)
    const host = url.hostname
    return whitelist.some((item) => {
      if (item.startsWith('*.')) {
        const base = item.slice(2)
        return host === base || host.endsWith(`.${base}`)
      }
      return item === origin
    })
  } catch {
    return false
  }
}

const corsOptions = {
  origin: (origin, cb) => (isAllowedOrigin(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  optionsSuccessStatus: 204
}

app.use(requestIdMiddleware)
app.use(cors(corsOptions))

const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta mas tarde' },
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health' || req.path.startsWith('/api/docs')
})

app.use(globalLimiter)

app.use(helmet())
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const openapiPath = path.resolve(__dirname, '../openapi.json')
let openapiSpec = null
try {
  openapiSpec = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'))
} catch (err) {
  logger.warn('openapi_load_failed', { error: err })
}

app.use((req, res, next) => (req.method === 'OPTIONS' ? next() : csrfProtect(req, res, next)))

const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  statusCounts: {},
  startTime: Date.now()
}

app.use(createHttpLoggerMiddleware({ metrics }))

app.get('/health', (req, res) => res.json({ status: 'OK' }))
app.get('/metrics', authRequired, requireRole('ADMIN'), (req, res) => {
  res.json({
    uptimeSec: Math.floor((Date.now() - metrics.startTime) / 1000),
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    statusCounts: metrics.statusCounts
  })
})

if (process.env.NODE_ENV === 'test' || process.env.TEST_E2E === 'true') {
  app.get('/_test/error', (req, res, next) => {
    const err = new Error('Exploto internamente en test')
    err.status = 500
    next(err)
  })
}

if (openapiSpec) {
  app.get('/api/docs.json', authRequired, requireRole('ADMIN'), (req, res) => res.json(openapiSpec))
  app.use('/api/docs', authRequired, requireRole('ADMIN'), swaggerUi.serve, swaggerUi.setup(openapiSpec))
}
app.use('/api', routes)

app.use(createErrorHandler({ metrics }))

export default app
