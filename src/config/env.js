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
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    DB_HOST: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    DB_PORT: z.preprocess(stringToNumber, z.number().int().positive().optional()),
    DB_NAME: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    DB_USER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    DB_PASS: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
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
    SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
    SMTP_PORT: z.preprocess(stringToNumber, z.number().int().positive().optional()),
    SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
    SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),
    MAIL_FROM: z.string().min(1),
    ACTIVATION_EXPIRES_MINUTES: z.preprocess(
        stringToNumber,
        z.number().int().positive().default(1440)
    )
}).superRefine((data, ctx) => {
    const hasDatabaseUrl = Boolean(data.DATABASE_URL)
    const dbValues = [data.DB_HOST, data.DB_PORT, data.DB_NAME, data.DB_USER, data.DB_PASS]
    const hasDiscreteDbConfig = dbValues.every(Boolean)

    if (!hasDatabaseUrl && !hasDiscreteDbConfig) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Debe configurar DATABASE_URL o DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS'
        })
    }

    const hasResend = Boolean(data.RESEND_API_KEY)
    const smtpValues = [data.SMTP_HOST, data.SMTP_PORT, data.SMTP_USER, data.SMTP_PASS]
    const hasSmtp = smtpValues.every(Boolean)

    if (!hasResend && !hasSmtp) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Debe configurar RESEND_API_KEY o SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS'
        })
    }
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
    databaseUrl: data.DATABASE_URL,
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
