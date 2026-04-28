import 'dotenv/config'

const required = [
    'PORT',
    'CORS_ORIGIN',
    'FRONT_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'REFRESH_SECRET',
    'REFRESH_EXPIRES_IN',
    'MAIL_FROM',
    'S3_REGION',
    'S3_BUCKET',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY'
]

const requireOneOf = [
    ['DATABASE_URL', 'DB_HOST'],
    ['RESEND_API_KEY', 'SMTP_HOST']
]

const fail = (message) => {
    console.error(message)
    process.exit(1)
}

for (const key of required) {
    if (!String(process.env[key] || '').trim()) {
        fail(`Falta variable obligatoria: ${key}`)
    }
}

for (const options of requireOneOf) {
    const ok = options.some((key) => String(process.env[key] || '').trim())
    if (!ok) {
        fail(`Debe configurar una de estas variables: ${options.join(', ')}`)
    }
}

await import('../config/env.js')

console.log('Validacion de entorno backend OK')
