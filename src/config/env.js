import 'dotenv/config'

export const env = {
    port: Number(process.env.PORT),
    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        pass: process.env.DB_PASS
    },
    cors: {
        origin: process.env.CORS_ORIGIN
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN 
    },
    refresh: {
        secret: process.env.REFRESH_SECRET,
        expiresIn: process.env.REFRESH_EXPIRES_IN
    },
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true',
        domain: process.env.COOKIE_DOMAIN || undefined
    },
    app: {
        frontUrl: process.env.FRONT_URL
    },
    mail: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM
    },
    activation: {
        expiresMinutes: Number(process.env.ACTIVATION_EXPIRES_MINUTES || 1440)
    }
}
