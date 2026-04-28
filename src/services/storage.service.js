import crypto from 'crypto'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'

const DEFAULT_SIGNED_URL_TTL_SECONDS = 900

const sanitizeName = (value) =>
    String(value || 'archivo')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(-120)

const extractBase64Payload = (value) => {
    const raw = String(value || '')
    return raw.includes(',') ? raw.split(',').pop() || '' : raw
}

const normalizeStorageKey = (storageKey) => {
    const value = String(storageKey || '').trim().replaceAll('\\', '/')
    if (!value || value.includes('..') || value.startsWith('/')) {
        const err = new Error('storageKey invalido')
        err.code = 'INVALID_STORAGE_KEY'
        throw err
    }
    return value
}

const buildStorageKey = ({ namespace, name }) => {
    const now = new Date()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const fileName = `${crypto.randomUUID()}-${sanitizeName(name)}`
    return normalizeStorageKey(`${namespace}/${now.getUTCFullYear()}/${month}/${fileName}`)
}

const readStorageConfig = () => {
    const region = String(process.env.S3_REGION || '').trim()
    const bucket = String(process.env.S3_BUCKET || '').trim()
    const accessKeyId = String(process.env.S3_ACCESS_KEY_ID || '').trim()
    const secretAccessKey = String(process.env.S3_SECRET_ACCESS_KEY || '').trim()
    const endpoint = String(process.env.S3_ENDPOINT || '').trim()
    const signedUrlTtlSeconds = Number(process.env.S3_SIGNED_URL_TTL_SECONDS || DEFAULT_SIGNED_URL_TTL_SECONDS)
    const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || 'false').trim().toLowerCase() === 'true'

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
        const err = new Error('Faltan variables S3 obligatorias')
        err.code = 'S3_CONFIG_INVALID'
        throw err
    }

    return {
        region,
        bucket,
        endpoint: endpoint || undefined,
        forcePathStyle,
        signedUrlTtlSeconds: Number.isFinite(signedUrlTtlSeconds) && signedUrlTtlSeconds > 0
            ? signedUrlTtlSeconds
            : DEFAULT_SIGNED_URL_TTL_SECONDS,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    }
}

const streamToBuffer = async (body) => {
    if (!body) return Buffer.alloc(0)
    if (Buffer.isBuffer(body)) return body
    if (body instanceof Uint8Array) return Buffer.from(body)
    if (typeof body.transformToByteArray === 'function') {
        const bytes = await body.transformToByteArray()
        return Buffer.from(bytes)
    }

    const chunks = []
    for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
}

export const createStorageService = ({
    client,
    bucket,
    region,
    signedUrlTtlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
    signer = awsGetSignedUrl
}) => {
    if (!client) throw new Error('S3 client requerido')
    if (!bucket) throw new Error('S3 bucket requerido')
    if (!region) throw new Error('S3 region requerida')

    const uploadFile = async ({ namespace = 'implants', name, data, mime = 'application/octet-stream' }) => {
        if (!name) {
            const err = new Error('Nombre de archivo requerido')
            err.code = 'STORAGE_NAME_REQUIRED'
            throw err
        }
        if (!data) {
            const err = new Error('Data de archivo requerida')
            err.code = 'STORAGE_DATA_REQUIRED'
            throw err
        }

        const base64 = extractBase64Payload(data)
        const buffer = Buffer.from(base64, 'base64')
        const storageKey = buildStorageKey({ namespace, name })

        try {
            await client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: storageKey,
                Body: buffer,
                ContentType: mime,
                ContentLength: buffer.length
            }))
        } catch (cause) {
            const err = new Error('No se pudo subir archivo a S3')
            err.code = 'S3_UPLOAD_FAILED'
            err.cause = cause
            throw err
        }

        return {
            storageKey,
            sizeBytes: buffer.length
        }
    }

    const getFileUrl = async ({ storageKey, expiresIn = signedUrlTtlSeconds, downloadName }) => {
        const key = normalizeStorageKey(storageKey)

        try {
            return await signer(
                client,
                new GetObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    ResponseContentDisposition: downloadName
                        ? `inline; filename="${sanitizeName(downloadName)}"`
                        : undefined
                }),
                { expiresIn }
            )
        } catch (cause) {
            const err = new Error('No se pudo generar URL firmada')
            err.code = 'S3_SIGNED_URL_FAILED'
            err.cause = cause
            throw err
        }
    }

    const getFileBase64 = async ({ storageKey }) => {
        const key = normalizeStorageKey(storageKey)

        try {
            const result = await client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: key
            }))
            const buffer = await streamToBuffer(result.Body)
            return buffer.toString('base64')
        } catch (cause) {
            const err = new Error('No se pudo leer archivo desde S3')
            err.code = 'S3_READ_FAILED'
            err.cause = cause
            throw err
        }
    }

    const deleteFile = async ({ storageKey }) => {
        if (!storageKey) return false
        const key = normalizeStorageKey(storageKey)

        try {
            await client.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: key
            }))
            return true
        } catch (cause) {
            const err = new Error('No se pudo eliminar archivo de S3')
            err.code = 'S3_DELETE_FAILED'
            err.cause = cause
            throw err
        }
    }

    return {
        uploadFile,
        getFileUrl,
        getFileBase64,
        deleteFile,
        saveFile: uploadFile
    }
}

let defaultStorageService = null
const mockStorage = new Map()

const createMockStorageService = () => ({
    async uploadFile({ namespace = 'implants', name, data, mime = 'application/octet-stream' }) {
        if (!name) {
            const err = new Error('Nombre de archivo requerido')
            err.code = 'STORAGE_NAME_REQUIRED'
            throw err
        }
        if (!data) {
            const err = new Error('Data de archivo requerida')
            err.code = 'STORAGE_DATA_REQUIRED'
            throw err
        }

        const base64 = extractBase64Payload(data)
        const buffer = Buffer.from(base64, 'base64')
        const storageKey = buildStorageKey({ namespace, name })
        mockStorage.set(storageKey, { buffer, mime })
        return {
            storageKey,
            sizeBytes: buffer.length
        }
    },
    async getFileUrl({ storageKey }) {
        const key = normalizeStorageKey(storageKey)
        if (!mockStorage.has(key)) {
            const err = new Error('Archivo no encontrado')
            err.code = 'S3_SIGNED_URL_FAILED'
            throw err
        }
        return `mock-s3://${key}`
    },
    async getFileBase64({ storageKey }) {
        const key = normalizeStorageKey(storageKey)
        const file = mockStorage.get(key)
        if (!file) {
            const err = new Error('Archivo no encontrado')
            err.code = 'S3_READ_FAILED'
            throw err
        }
        return file.buffer.toString('base64')
    },
    async deleteFile({ storageKey }) {
        if (!storageKey) return false
        const key = normalizeStorageKey(storageKey)
        return mockStorage.delete(key)
    },
    async saveFile(params) {
        return this.uploadFile(params)
    }
})

const getDefaultStorageService = () => {
    if (defaultStorageService) return defaultStorageService

    if (process.env.TEST_STORAGE_MOCK === 'true') {
        defaultStorageService = createMockStorageService()
        return defaultStorageService
    }

    const storageConfig = readStorageConfig()
    const s3Client = new S3Client({
        region: storageConfig.region,
        endpoint: storageConfig.endpoint,
        forcePathStyle: storageConfig.forcePathStyle,
        credentials: storageConfig.credentials
    })

    defaultStorageService = createStorageService({
        client: s3Client,
        bucket: storageConfig.bucket,
        region: storageConfig.region,
        signedUrlTtlSeconds: storageConfig.signedUrlTtlSeconds
    })

    return defaultStorageService
}

export const uploadFile = async (params) => getDefaultStorageService().uploadFile(params)
export const getFileUrl = async (params) => getDefaultStorageService().getFileUrl(params)
export const getFileBase64 = async (params) => getDefaultStorageService().getFileBase64(params)
export const deleteFile = async (params) => getDefaultStorageService().deleteFile(params)
export const saveFile = async (params) => getDefaultStorageService().saveFile(params)
