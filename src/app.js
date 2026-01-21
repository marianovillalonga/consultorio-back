import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { csrfProtect } from './middlewares/csrf.js'
import routes from './routes/index.js'

const app = express()

app.set('trust proxy', 1)

const whitelist = (env?.cors?.origin || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const isAllowedOrigin = (origin) => {
  if (!origin) return true 
  try {
    const url = new URL(origin)
    const host = url.hostname
    return whitelist.some(item => {
      if (item.startsWith('*.')) {
        const base = item.slice(2)
        return host === base || host.endsWith(`.${base}`)
      }
      return item === origin
    })
  } catch { return false }
}

const corsOptions = {
  origin: (origin, cb) => isAllowedOrigin(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS')),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  optionsSuccessStatus: 204,
}

app.use((req, res, next) => {
  if (req.headers.origin) {
    console.log('🔍 Origin recibido:', req.headers.origin)
  }
  next()
})

app.use(cors(corsOptions))

app.use(helmet())
app.use(express.json({ limit: '50mb' }))
app.use(cookieParser())

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const openapiPath = path.resolve(__dirname, '../openapi.json')
let openapiSpec = null
try {
  openapiSpec = JSON.parse(fs.readFileSync(openapiPath, 'utf-8'))
} catch (err) {
  console.warn('[openapi] No se pudo cargar openapi.json', err?.message)
}

app.use((req, res, next) => req.method === 'OPTIONS' ? next() : csrfProtect(req, res, next))

app.get('/health', (req, res) => res.json({ status: 'OK' }))
if (openapiSpec) {
  app.get('/api/docs.json', (req, res) => res.json(openapiSpec))
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec))
}
app.use('/api', routes)

app.use((err, req, res, next) => {
  console.error('[Error Handler]', err)
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: origin no permitido' })
  }
  res.status(500).json({ error: err?.message || 'Internal Server Error' })
})

export default app
