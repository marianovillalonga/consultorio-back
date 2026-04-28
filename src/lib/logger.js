const SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'resettoken',
    'authorization',
    'cookie',
    'set-cookie',
    'x-csrf-token'
])

const MAX_DEPTH = 5

let activeSink = null

const redactValue = () => '[REDACTED]'

const isPlainObject = (value) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof Error) &&
    !Buffer.isBuffer(value)

const sanitizeKey = (key) => String(key || '').toLowerCase()

export const serializeError = (error) => {
    if (!error) return null
    return {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        code: error.code || null,
        status: error.status || error.statusCode || null,
        stack: error.stack || null
    }
}

export const sanitizeLogData = (value, depth = 0) => {
    if (depth > MAX_DEPTH) return '[TRUNCATED]'
    if (value === null || value === undefined) return value
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
    if (value instanceof Date) return value.toISOString()
    if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`
    if (value instanceof Error) return sanitizeLogData(serializeError(value), depth + 1)
    if (Array.isArray(value)) return value.map((item) => sanitizeLogData(item, depth + 1))
    if (!isPlainObject(value)) return String(value)

    const sanitized = {}
    for (const [key, nestedValue] of Object.entries(value)) {
        if (SENSITIVE_KEYS.has(sanitizeKey(key))) {
            sanitized[key] = redactValue()
            continue
        }
        sanitized[key] = sanitizeLogData(nestedValue, depth + 1)
    }
    return sanitized
}

const writeLog = (entry) => {
    const line = JSON.stringify(entry)
    if (typeof activeSink === 'function') {
        activeSink(entry)
        return
    }

    if (entry.level === 'error') {
        console.error(line)
        return
    }
    if (entry.level === 'warn') {
        console.warn(line)
        return
    }
    console.log(line)
}

export const setLoggerSink = (sink) => {
    activeSink = sink
}

export const resetLoggerSink = () => {
    activeSink = null
}

export const createLogger = (context = {}) => {
    const log = (level, message, details = {}) => {
        writeLog({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...sanitizeLogData(context),
            ...sanitizeLogData(details)
        })
    }

    return {
        child(nextContext = {}) {
            return createLogger({
                ...context,
                ...nextContext
            })
        },
        info(message, details) {
            log('info', message, details)
        },
        warn(message, details) {
            log('warn', message, details)
        },
        error(message, details) {
            log('error', message, details)
        }
    }
}

const logger = createLogger({ service: 'consultorio-back' })

export default logger
