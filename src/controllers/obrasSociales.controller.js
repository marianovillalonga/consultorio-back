import { z } from 'zod'
import { ObraSocial } from '../models/index.js'
import { scrapeAodslObrasSociales } from '../services/aodslScraper.js'

const arancelSchema = z.object({
    codigo: z.string().min(1).max(50),
    descripcion: z.string().min(1).max(300),
    vigenciaDesde: z.string().optional(),
    vigenciaHasta: z.string().optional(),
    arancelTotal: z.number().nonnegative().optional(),
    copago: z.number().nonnegative().optional()
})

const planSchema = z.object({
    nombre: z.string().min(2).max(120),
    descripcion: z.string().max(500).optional(),
    copago: z.number().nonnegative().optional(),
    cobertura: z.string().max(300).optional()
})

const alertaSchema = z.object({
    tipo: z.enum(['info', 'warning', 'critical']),
    mensaje: z.string().min(2).max(300),
    activo: z.boolean().default(true)
})

const obraSchema = z.object({
    numeroObraSocial: z.string().max(50).optional(),
    nombre: z.string().min(2).max(150),
    descripcion: z.string().max(2000).optional(),
    telefono: z.string().max(50).optional(),
    email: z.string().email().optional(),
    notas: z.string().max(2000).optional(),
    copagoDefault: z.number().nonnegative().optional(),
    planes: planSchema.array().optional(),
    alertas: alertaSchema.array().optional(),
    aranceles: arancelSchema.array().optional(),
    normasTrabajoFileName: z.string().max(200).optional(),
    normasTrabajoFileData: z.string().max(5000000).optional(),
    normasFacturacionFileName: z.string().max(200).optional(),
    normasFacturacionFileData: z.string().max(5000000).optional()
})

export const listObras = async (_req, res) => {
    const obras = await ObraSocial.findAll({ order: [['nombre', 'ASC']] })
    res.json({ obras })
}

export const createObra = async (req, res) => {
    const parsed = obraSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    const aranceles = parsed.data.aranceles || []
    const invalidCopago = aranceles.find((a) => a.arancelTotal !== undefined && a.copago !== undefined && a.copago > a.arancelTotal)
    if (invalidCopago) {
        return res.status(400).json({ message: 'El copago no puede superar el arancel total' })
    }
    const obra = await ObraSocial.create(parsed.data)
    res.status(201).json({ obra })
}

export const updateObra = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })
    const parsed = obraSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.errors })
    const aranceles = parsed.data.aranceles || []
    const invalidCopago = aranceles.find((a) => a.arancelTotal !== undefined && a.copago !== undefined && a.copago > a.arancelTotal)
    if (invalidCopago) {
        return res.status(400).json({ message: 'El copago no puede superar el arancel total' })
    }
    const obra = await ObraSocial.findByPk(id)
    if (!obra) return res.status(404).json({ message: 'Obra social no encontrada' })
    await obra.update(parsed.data)
    res.json({ obra })
}

export const deleteObra = async (req, res) => {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'ID requerido' })
    const obra = await ObraSocial.findByPk(id)
    if (!obra) return res.status(404).json({ message: 'Obra social no encontrada' })
    await obra.destroy()
    res.json({ ok: true })
}

export const scrapeObras = async (_req, res) => {
    const username = process.env.scrappingUsu || process.env.SCRAPPING_USU
    const password = process.env.scrappingPass || process.env.SCRAPPING_PASS
    if (!username || !password) {
        return res.status(400).json({ message: 'Faltan credenciales de scrapping' })
    }
    try {
        const result = await scrapeAodslObrasSociales({ username, password })
        res.json({ ok: true, ...result })
    } catch (err) {
        const e = err instanceof Error ? err : new Error('Error al scrappear obras sociales')
        res.status(500).json({ message: e.message })
    }
}
