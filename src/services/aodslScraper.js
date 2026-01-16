import { chromium } from 'playwright'
import { ObraSocial } from '../models/index.js'

const LOGIN_URL = 'http://www.aodsl.com.ar:8080/gwaodsl/servlet/com.gestionwebaodsl.login'

const cleanText = (value) => (value || '').replace(/\s+/g, ' ').trim()

const parseMoney = (value) => {
    const cleaned = (value || '').replace(/\s+/g, '').trim()
    if (!cleaned) return undefined
    const normalized = cleaned.replace(/\./g, '').replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
}

const parseVigenciaHeader = (value) => {
    const text = cleanText(value)
    const match = text.match(/vigencia desde:\s*(\d{2}\/\d{2}\/\d{4})\s*hasta\s*(\d{2}\/\d{2}\/\d{4})/i)
    if (!match) return { vigenciaDesde: undefined, vigenciaHasta: undefined }
    return { vigenciaDesde: match[1], vigenciaHasta: match[2] }
}

const extractObrasFromGrid = async (page) => {
    return page.$$eval('#GridContainerTbl tbody tr', (rows) =>
        rows.map((row) => {
            const numero = row.querySelector('[id^="span_vOBRAPLAN_"]')?.textContent || ''
            const nombre = row.querySelector('[id^="span_OBRASOCIALDESCRIPCION_"] a')?.textContent || ''
            const descripcion = row.querySelector('[id^="span_ARANCELDESCRIPCION_"]')?.textContent || ''
            return {
                numero: numero.trim(),
                nombre: nombre.trim(),
                descripcion: descripcion.trim()
            }
        })
    )
}

const extractAranceles = async (page, vigenciaFallback) => {
    const headerText = await page.locator('text=/Resultado para la obra social/i').first().textContent().catch(() => '')
    const headerVigencias = parseVigenciaHeader(headerText || '')
    const vigenciaDesde = headerVigencias.vigenciaDesde || vigenciaFallback?.vigenciaDesde
    const vigenciaHasta = headerVigencias.vigenciaHasta || vigenciaFallback?.vigenciaHasta

    const rows = await page.$$eval('#Grid1ContainerTbl tbody tr', (trs) =>
        trs.map((row) => {
            const codigo = row.querySelector('[id^="span_vGPRACTICACODIGO_"]')?.textContent || ''
            const descripcion = row.querySelector('[id^="span_vOBRASOCIALPRACTICADESCRIPCION_"]')?.textContent || ''
            const vigencia = row.querySelector('[id^="span_vGARANCELFECHAVIGENCIADESDE_"]')?.textContent || ''
            const arancelTotal = row.querySelector('[id^="span_vARANCELTOTAL_"]')?.textContent || ''
            const copago = row.querySelector('[id^="span_vCOPAGOAFILIADO_"]')?.textContent || ''
            return {
                codigo: codigo.trim(),
                descripcion: descripcion.trim(),
                vigenciaDesde: vigencia.trim(),
                arancelTotal,
                copago
            }
        })
    )

    return rows
        .filter((row) => row.codigo && row.descripcion)
        .map((row) => ({
            codigo: row.codigo,
            descripcion: row.descripcion,
            vigenciaDesde: row.vigenciaDesde || vigenciaDesde,
            vigenciaHasta,
            arancelTotal: parseMoney(row.arancelTotal),
            copago: parseMoney(row.copago)
        }))
}

const isNextDisabled = async (page) => {
    const next = await page.$('.PagingButtonsNext')
    if (!next) return true
    const disabled = await next.getAttribute('disabled')
    if (disabled !== null) return true
    const className = await next.getAttribute('class')
    return (className || '').includes('gx-grid-paging-disabled')
}

export const scrapeAodslObrasSociales = async ({ username, password }) => {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    let totalObras = 0
    let totalAranceles = 0

    try {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' })
        await page.fill('#vUSUARIOID', username)
        await page.fill('#vPASSWORD', password)
        await page.click('#BTNINGRESAR')

        await page.waitForSelector('text=Aranceles y normas', { timeout: 30000 })
        await page.click('text=Aranceles y normas')
        await page.waitForSelector('text=Consultar aranceles y normas', { timeout: 30000 })
        await page.click('text=Consultar aranceles y normas')
        await page.waitForSelector('#GridContainerTbl', { timeout: 30000 })

        while (true) {
            const obras = await extractObrasFromGrid(page)
            for (let index = 0; index < obras.length; index += 1) {
                const obra = obras[index]
                const linkSelector = `#GridContainerTbl tbody tr:nth-child(${index + 1}) [id^="span_OBRASOCIALDESCRIPCION_"] a`
                await page.click(linkSelector)
                await page.waitForSelector('#IMAGE1', { timeout: 30000 })
                await page.click('#IMAGE1')
                await page.waitForSelector('#Grid1ContainerTbl', { timeout: 30000 })

                const aranceles = await extractAranceles(page)
                totalObras += 1
                totalAranceles += aranceles.length

                const numero = obra.numero || null
                const nombre = obra.nombre || 'Sin nombre'
                const descripcion = obra.descripcion || null
                const existing = numero
                    ? await ObraSocial.findOne({ where: { numeroObraSocial: numero } })
                    : await ObraSocial.findOne({ where: { nombre } })

                if (existing) {
                    await existing.update({
                        nombre: nombre.slice(0, 150),
                        numeroObraSocial: numero || existing.numeroObraSocial,
                        descripcion,
                        aranceles
                    })
                } else {
                    await ObraSocial.create({
                        nombre: nombre.slice(0, 150),
                        numeroObraSocial: numero,
                        descripcion,
                        aranceles
                    })
                }

                await page.goBack({ waitUntil: 'domcontentloaded' })
                await page.goBack({ waitUntil: 'domcontentloaded' })
                await page.waitForSelector('#GridContainerTbl', { timeout: 30000 })
            }

            if (await isNextDisabled(page)) break
            await page.click('.PagingButtonsNext')
            await page.waitForSelector('#GridContainerTbl', { timeout: 30000 })
        }
    } finally {
        await browser.close()
    }

    return { totalObras, totalAranceles }
}
