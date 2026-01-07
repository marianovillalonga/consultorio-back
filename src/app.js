import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { env } from './config/env.js'
import { csrfProtect } from './middlewares/csrf.js'
import routes from './routes/index.js'

const app = express()

app.use(helmet())
app.use(
    cors({
        origin: env.cors.origin ? env.cors.origin.split(',') : true,
        credentials: true
    })
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(csrfProtect)

app.get('/health', (req, res) => res.json({ status: 'OK' }))

app.use('/api', routes)

export default app
