import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORAGE_ROOT = path.resolve(__dirname, '../../storage')

const ensureInsideStorage = (storageKey) => {
  const resolved = path.resolve(STORAGE_ROOT, storageKey)
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error('storageKey invalido')
  }
  return resolved
}

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true })
}

const extractBase64Payload = (value) => {
  const raw = String(value || '')
  return raw.includes(',') ? raw.split(',').pop() || '' : raw
}

const sanitizeName = (value) =>
  String(value || 'archivo')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120)

export const saveFile = async ({ namespace = 'implants', name, data }) => {
  const base64 = extractBase64Payload(data)
  const buffer = Buffer.from(base64, 'base64')
  const now = new Date()
  const folder = path.join(
    namespace,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0')
  )
  const fileName = `${crypto.randomUUID()}-${sanitizeName(name)}`
  const storageKey = path.join(folder, fileName)
  const target = ensureInsideStorage(storageKey)

  await ensureDir(path.dirname(target))
  await fs.writeFile(target, buffer)

  return {
    storageKey: storageKey.replaceAll('\\', '/'),
    sizeBytes: buffer.length
  }
}

export const getFileBase64 = async ({ storageKey }) => {
  const target = ensureInsideStorage(storageKey)
  const buffer = await fs.readFile(target)
  return buffer.toString('base64')
}

export const deleteFile = async ({ storageKey }) => {
  if (!storageKey) return false
  try {
    const target = ensureInsideStorage(storageKey)
    await fs.unlink(target)
    return true
  } catch (err) {
    if (err?.code === 'ENOENT') return false
    throw err
  }
}
