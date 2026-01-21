import 'dotenv/config'
import { z } from 'zod'

const emptyToUndefined = (val) => {
    if (typeof val === 'string' && val.trim() === '') return undefined
    return val
}

const stringToNumber = (val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return Number.isNaN(num) ? val : num
}

const envSchema = z.object({
    NODE_ENV: z.string().optional(),
    PORT: z.preprocess(stringToNumber, z.number().int().positive()),
    DB_HOST: z.string().min(1),
    DB_PORT: z.preprocess(stringToNumber, z.number().int().positive()),
    DB_NAME: z.string().min(1),
    DB_USER: z.string().min(1),
    DB_PASS: z.string().min(1),
    CORS_ORIGIN: z.preprocess(emptyToUndefined, z.string().optional()),
    JWT_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().min(1),
    REFRESH_SECRET: z.string().min(1),
    REFRESH_EXPIRES_IN: z.string().min(1),
    RESET_EXPIRES_MINUTES: z.preprocess(
        stringToNumber,
        z.number().int().positive().default(60)
    ),
    COOKIE_SECURE: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
    COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional()),
    FRONT_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.preprocess(stringToNumber, z.number().int().positive()),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    MAIL_FROM: z.string().min(1),
    ACTIVATION_EXPIRES_MINUTES: z.preprocess(
        stringToNumber,
        z.number().int().positive().default(1440)
    )
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
    const details = parsed.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')
    throw new Error(`Invalid environment variables: ${details}`)
}

const data = parsed.data

export const env = {
    port: data.PORT,
    db: {
        host: data.DB_HOST,
        port: data.DB_PORT,
        name: data.DB_NAME,
        user: data.DB_USER,
        pass: data.DB_PASS
    },
    cors: {
        origin: data.CORS_ORIGIN || ''
    },
    jwt: {
        secret: data.JWT_SECRET,
        expiresIn: data.JWT_EXPIRES_IN
    },
    refresh: {
        secret: data.REFRESH_SECRET,
        expiresIn: data.REFRESH_EXPIRES_IN
    },
    reset: {
        expiresMinutes: data.RESET_EXPIRES_MINUTES
    },
    cookie: {
        secure: data.COOKIE_SECURE === 'true',
        domain: data.COOKIE_DOMAIN || undefined
    },
    app: {
        frontUrl: data.FRONT_URL
    },
    resend: {
        apiKey: data.RESEND_API_KEY
    },
    mail: {
        host: data.SMTP_HOST,
        port: data.SMTP_PORT,
        user: data.SMTP_USER,
        pass: data.SMTP_PASS,
        from: data.MAIL_FROM
    },
    activation: {
        expiresMinutes: data.ACTIVATION_EXPIRES_MINUTES
    }
}
