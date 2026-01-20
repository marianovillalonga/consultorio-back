import { Patient } from '../models/index.js'

const toDate = (value, endOfDay = false) => {
    if (!value) return null
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return null
    if (endOfDay) {
        d.setHours(23, 59, 59, 999)
    } else {
        d.setHours(0, 0, 0, 0)
    }
    return d
}

const normalizePayments = (raw) => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const computeBalance = (payments) =>
    payments.reduce((acc, p) => {
        const svc = Number(p?.serviceAmount || 0) || 0
        const paid = Number(p?.amount || 0) || 0
        return acc + (paid - svc)
    }, 0)

export const paymentsReport = async (req, res) => {
    const { start, end, method, patientId } = req.query
    const startDate = toDate(start)
    const endDate = toDate(end, true)

    const where = patientId ? { id: Number(patientId) } : undefined
    const patients = where ? await Patient.findAll({ where }) : await Patient.findAll()

    const payments = []
    const balances = []
    let totalPayments = 0
    let totalService = 0
    let paymentsCount = 0
    let patientsWithDebt = 0
    let patientsWithCredit = 0

    for (const patient of patients) {
        const list = normalizePayments(patient.payments)
        const balance = computeBalance(list)
        balances.push({
            patientId: patient.id,
            patientName: patient.fullName,
            balance
        })
        if (balance < 0) patientsWithDebt += 1
        if (balance > 0) patientsWithCredit += 1

        for (const payment of list) {
            const dateValue = payment?.date ? new Date(payment.date) : null
            if (!dateValue || Number.isNaN(dateValue.getTime())) continue
            if (startDate && dateValue < startDate) continue
            if (endDate && dateValue > endDate) continue
            if (method && String(payment.method || '').toLowerCase() !== String(method).toLowerCase()) continue

            const amount = Number(payment.amount || 0) || 0
            const serviceAmount = Number(payment.serviceAmount || 0) || 0
            totalPayments += amount
            totalService += serviceAmount
            paymentsCount += 1
            payments.push({
                patientId: patient.id,
                patientName: patient.fullName,
                amount,
                serviceAmount,
                method: payment.method || '',
                date: payment.date,
                note: payment.note || ''
            })
        }
    }

    payments.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

    res.json({
        summary: {
            totalPayments,
            totalService,
            netBalance: balances.reduce((acc, b) => acc + (Number(b.balance) || 0), 0),
            paymentsCount,
            patientsWithDebt,
            patientsWithCredit
        },
        payments,
        balances
    })
}
