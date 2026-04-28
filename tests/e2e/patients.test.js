import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'
import { Implant } from '../../src/models/index.js'
import { getFileBase64 } from '../../src/services/storage.service.js'
import { Patient } from '../../src/models/index.js'
import {
    shouldRunE2E,
    connectDb,
    closeDb,
    createTestEmail,
    ensureUser,
    loginAndGetSession
} from '../helpers/e2e.js'

if (shouldRunE2E()) {
    before(async () => {
        await connectDb()
    })

    after(async () => {
        await closeDb()
    })

    test('crear y listar pacientes', async () => {
        const adminEmail = createTestEmail('admin')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)
        assert.ok(csrfToken)
        assert.ok(cookieHeader)

        const patientEmail = createTestEmail('patient')
        const createRes = await request(app)
            .post('/api/patients')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({ fullName: 'Paciente E2E', email: patientEmail })

        assert.equal(createRes.status, 201)
        assert.ok(createRes.body?.patient?.id)

        const listRes = await request(app)
            .get('/api/patients')
            .set('Cookie', cookieHeader)

        assert.equal(listRes.status, 200)
        assert.ok(Array.isArray(listRes.body?.patients))
    })

    test('crear usuario odontologo desde admin crea perfil y permite /api/account/profile', async () => {
        const adminEmail = createTestEmail('admin-dentist')
        const adminPassword = 'Password123!'
        await ensureUser({ email: adminEmail, password: adminPassword, role: 'ADMIN' })

        const adminSession = await loginAndGetSession(app, {
            email: adminEmail,
            password: adminPassword
        })

        assert.equal(adminSession.loginRes.status, 200)
        assert.ok(adminSession.csrfToken)
        assert.ok(adminSession.cookieHeader)

        const dentistEmail = createTestEmail('odontologo')
        const dentistPassword = 'Password123!'

        const createUserRes = await request(app)
            .post('/api/admin/users')
            .set('Cookie', adminSession.cookieHeader)
            .set('X-CSRF-Token', adminSession.csrfToken)
            .send({
                email: dentistEmail,
                password: dentistPassword,
                active: true
            })

        assert.equal(createUserRes.status, 201)
        assert.ok(createUserRes.body?.user?.id)

        const dentistSession = await loginAndGetSession(app, {
            email: dentistEmail,
            password: dentistPassword
        })

        assert.equal(dentistSession.loginRes.status, 200)
        assert.ok(dentistSession.cookieHeader)

        const profileRes = await request(app)
            .get('/api/account/profile')
            .set('Cookie', dentistSession.cookieHeader)

        assert.equal(profileRes.status, 200)
        assert.equal(profileRes.body?.type, 'dentist')
        assert.ok(profileRes.body?.data?.id)
    })

    test('payments es la unica fuente de verdad para balance en listado, detalle y reporte', async () => {
        const adminEmail = createTestEmail('admin-payments')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)
        assert.ok(csrfToken)
        assert.ok(cookieHeader)

        const patientEmail = createTestEmail('patient-payments')
        const payments = [
            {
                amount: 15000,
                serviceAmount: 10000,
                method: 'transferencia',
                date: '2026-05-10T10:00:00.000Z',
                note: 'Pago 1'
            },
            {
                amount: 3000,
                serviceAmount: 5000,
                method: 'efectivo',
                date: '2026-05-11T10:00:00.000Z',
                note: 'Pago 2'
            }
        ]

        const createRes = await request(app)
            .post('/api/patients')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                fullName: 'Paciente Balance E2E',
                email: patientEmail,
                balance: 999999,
                payments
            })

        assert.equal(createRes.status, 201)
        const patientId = createRes.body?.patient?.id
        assert.ok(patientId)
        assert.equal(createRes.body?.patient?.balance, 3000)

        const listRes = await request(app)
            .get('/api/patients')
            .set('Cookie', cookieHeader)

        assert.equal(listRes.status, 200)
        const listedPatient = listRes.body?.patients?.find((p) => p.id === patientId)
        assert.ok(listedPatient)
        assert.equal(listedPatient.balance, 3000)

        const detailRes = await request(app)
            .get(`/api/patients/${patientId}`)
            .set('Cookie', cookieHeader)

        assert.equal(detailRes.status, 200)
        assert.equal(detailRes.body?.patient?.balance, 3000)

        const reportRes = await request(app)
            .get(`/api/reports/payments?patientId=${patientId}`)
            .set('Cookie', cookieHeader)

        assert.equal(reportRes.status, 200)
        const reportBalance = reportRes.body?.balances?.find((b) => b.patientId === patientId)
        assert.ok(reportBalance)
        assert.equal(reportBalance.balance, 3000)
    })

    test('implante nuevo guarda archivo sin base64 en DB y permite descarga', async () => {
        const adminEmail = createTestEmail('admin-implant-storage')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)
        assert.ok(csrfToken)
        assert.ok(cookieHeader)

        const patientEmail = createTestEmail('patient-implant-storage')
        const createPatientRes = await request(app)
            .post('/api/patients')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({ fullName: 'Paciente Implante Storage', email: patientEmail })

        assert.equal(createPatientRes.status, 201)
        const patientId = createPatientRes.body?.patient?.id
        assert.ok(patientId)

        const fileData = Buffer.from('archivo de implante e2e').toString('base64')
        const createImplantRes = await request(app)
            .post(`/api/patients/${patientId}/implants`)
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                piece: '11',
                planning: {
                    files: [
                        {
                            id: 'plan-file-1',
                            name: 'plan.txt',
                            mime: 'text/plain',
                            data: fileData,
                            description: 'Plan',
                            createdAt: '2026-05-12T10:00:00.000Z'
                        }
                    ]
                }
            })

        assert.equal(createImplantRes.status, 201)
        const implantId = createImplantRes.body?.implant?.id
        assert.ok(implantId)
        const returnedFile = createImplantRes.body?.implant?.planning?.files?.[0]
        assert.ok(returnedFile)
        assert.equal(returnedFile.name, 'plan.txt')
        assert.equal(returnedFile.data, undefined)

        const storedImplant = await Implant.findByPk(implantId)
        const storedFile = storedImplant?.toJSON()?.planning?.files?.[0]
        assert.ok(storedFile?.storageKey)
        assert.equal(storedFile?.data, undefined)

        const downloadRes = await request(app)
            .get(`/api/patients/${patientId}/implants/${implantId}/files/plan-file-1`)
            .set('Cookie', cookieHeader)

        assert.equal(downloadRes.status, 200)
        assert.equal(downloadRes.body?.file?.data, fileData)
    })

    test('implante legacy con base64 en DB sigue siendo descargable', async () => {
        const adminEmail = createTestEmail('admin-implant-legacy')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)
        assert.ok(csrfToken)
        assert.ok(cookieHeader)

        const patientEmail = createTestEmail('patient-implant-legacy')
        const createPatientRes = await request(app)
            .post('/api/patients')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({ fullName: 'Paciente Implante Legacy', email: patientEmail })

        assert.equal(createPatientRes.status, 201)
        const patientId = createPatientRes.body?.patient?.id
        assert.ok(patientId)

        const legacyData = Buffer.from('legacy implant data').toString('base64')
        const legacyImplant = await Implant.create({
            clinicId: 1,
            patientId,
            piece: '12',
            createdByUserId: null,
            updatedByUserId: null,
            planning: {
                files: [
                    {
                        id: 'legacy-file-1',
                        name: 'legacy.txt',
                        mime: 'text/plain',
                        data: legacyData,
                        description: 'Legacy',
                        createdAt: '2026-05-12T11:00:00.000Z',
                        uploadedBy: null
                    }
                ]
            }
        })

        const downloadRes = await request(app)
            .get(`/api/patients/${patientId}/implants/${legacyImplant.id}/files/legacy-file-1`)
            .set('Cookie', cookieHeader)

        assert.equal(downloadRes.status, 200)
        assert.equal(downloadRes.body?.file?.data, legacyData)
    })

    test('update de implante reemplaza archivo y limpia el storage anterior', async () => {
        const adminEmail = createTestEmail('admin-implant-replace')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)

        const patientEmail = createTestEmail('patient-implant-replace')
        const createPatientRes = await request(app)
            .post('/api/patients')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({ fullName: 'Paciente Implante Replace', email: patientEmail })

        const patientId = createPatientRes.body?.patient?.id
        assert.ok(patientId)

        const originalData = Buffer.from('archivo original implante').toString('base64')
        const createImplantRes = await request(app)
            .post(`/api/patients/${patientId}/implants`)
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                piece: '13',
                planning: {
                    files: [
                        {
                            id: 'replace-file-1',
                            name: 'replace.txt',
                            mime: 'text/plain',
                            data: originalData,
                            createdAt: '2026-05-12T12:00:00.000Z'
                        }
                    ]
                }
            })

        assert.equal(createImplantRes.status, 201)
        const implantId = createImplantRes.body?.implant?.id
        const beforeUpdate = await Implant.findByPk(implantId)
        const previousStorageKey = beforeUpdate?.toJSON()?.planning?.files?.[0]?.storageKey
        assert.ok(previousStorageKey)

        const newData = Buffer.from('archivo reemplazado implante').toString('base64')
        const updateRes = await request(app)
            .patch(`/api/patients/${patientId}/implants/${implantId}`)
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                planning: {
                    files: [
                        {
                            id: 'replace-file-1',
                            name: 'replace.txt',
                            mime: 'text/plain',
                            data: newData,
                            createdAt: '2026-05-12T12:00:00.000Z'
                        }
                    ]
                }
            })

        assert.equal(updateRes.status, 200)
        assert.equal(updateRes.body?.implant?.planning?.files?.[0]?.data, undefined)

        const afterUpdate = await Implant.findByPk(implantId)
        const currentStorageKey = afterUpdate?.toJSON()?.planning?.files?.[0]?.storageKey
        assert.ok(currentStorageKey)
        assert.notEqual(currentStorageKey, previousStorageKey)

        await assert.rejects(() => getFileBase64({ storageKey: previousStorageKey }))

        const downloadRes = await request(app)
            .get(`/api/patients/${patientId}/implants/${implantId}/files/replace-file-1`)
            .set('Cookie', cookieHeader)

        assert.equal(downloadRes.status, 200)
        assert.equal(downloadRes.body?.file?.data, newData)
    })

    test('update de implante eliminando archivo quita referencia y limpia storage', async () => {
        const adminEmail = createTestEmail('admin-implant-remove')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)

        const patientEmail = createTestEmail('patient-implant-remove')
        const createPatientRes = await request(app)
            .post('/api/patients')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({ fullName: 'Paciente Implante Remove', email: patientEmail })

        const patientId = createPatientRes.body?.patient?.id
        assert.ok(patientId)

        const fileData = Buffer.from('archivo para eliminar implante').toString('base64')
        const createImplantRes = await request(app)
            .post(`/api/patients/${patientId}/implants`)
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                piece: '14',
                planning: {
                    files: [
                        {
                            id: 'remove-file-1',
                            name: 'remove.txt',
                            mime: 'text/plain',
                            data: fileData,
                            createdAt: '2026-05-12T13:00:00.000Z'
                        }
                    ]
                }
            })

        const implantId = createImplantRes.body?.implant?.id
        const storedBefore = await Implant.findByPk(implantId)
        const previousStorageKey = storedBefore?.toJSON()?.planning?.files?.[0]?.storageKey
        assert.ok(previousStorageKey)

        const updateRes = await request(app)
            .patch(`/api/patients/${patientId}/implants/${implantId}`)
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                planning: {
                    files: []
                }
            })

        assert.equal(updateRes.status, 200)
        assert.deepEqual(updateRes.body?.implant?.planning?.files || [], [])

        const storedAfter = await Implant.findByPk(implantId)
        assert.deepEqual(storedAfter?.toJSON()?.planning?.files || [], [])
        await assert.rejects(() => getFileBase64({ storageKey: previousStorageKey }))
    })

    test('delete de implante limpia archivos en storage', async () => {
        const adminEmail = createTestEmail('admin-implant-delete')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)

        const patientEmail = createTestEmail('patient-implant-delete')
        const createPatientRes = await request(app)
            .post('/api/patients')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({ fullName: 'Paciente Implante Delete', email: patientEmail })

        const patientId = createPatientRes.body?.patient?.id
        assert.ok(patientId)

        const fileData = Buffer.from('archivo para delete implante').toString('base64')
        const createImplantRes = await request(app)
            .post(`/api/patients/${patientId}/implants`)
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                piece: '15',
                planning: {
                    files: [
                        {
                            id: 'delete-file-1',
                            name: 'delete.txt',
                            mime: 'text/plain',
                            data: fileData,
                            createdAt: '2026-05-12T14:00:00.000Z'
                        }
                    ]
                }
            })

        const implantId = createImplantRes.body?.implant?.id
        const storedBefore = await Implant.findByPk(implantId)
        const storageKey = storedBefore?.toJSON()?.planning?.files?.[0]?.storageKey
        assert.ok(storageKey)

        const deleteRes = await request(app)
            .delete(`/api/patients/${patientId}/implants/${implantId}`)
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)

        assert.equal(deleteRes.status, 200)
        assert.equal(deleteRes.body?.ok, true)

        const deletedImplant = await Implant.findByPk(implantId)
        assert.equal(deletedImplant, null)
        await assert.rejects(() => getFileBase64({ storageKey }))
    })

    test('paciente nuevo con studiesFiles guarda storageKey sin base64 en DB y descarga funciona', async () => {
        const adminEmail = createTestEmail('admin-studies-storage')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)

        const studyData = Buffer.from('archivo study nuevo').toString('base64')
        const studiesFiles = JSON.stringify([
            {
                id: 'study-file-1',
                name: 'study.txt',
                mime: 'text/plain',
                data: studyData,
                description: 'Study',
                createdAt: '2026-05-13T10:00:00.000Z'
            }
        ])

        const createRes = await request(app)
            .post('/api/patients')
            .set('Cookie', cookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({
                fullName: 'Paciente Studies Storage',
                email: createTestEmail('patient-studies-storage'),
                studiesFiles
            })

        assert.equal(createRes.status, 201)
        const patientId = createRes.body?.patient?.id
        assert.ok(patientId)

        const responseStudies = JSON.parse(createRes.body?.patient?.studiesFiles || '[]')
        assert.equal(responseStudies[0]?.data, undefined)

        const storedPatient = await Patient.findByPk(patientId)
        const storedStudies = JSON.parse(storedPatient?.studiesFiles || '[]')
        assert.ok(storedStudies[0]?.storageKey)
        assert.equal(storedStudies[0]?.data, undefined)

        const detailRes = await request(app)
            .get(`/api/patients/${patientId}`)
            .set('Cookie', cookieHeader)

        assert.equal(detailRes.status, 200)
        const detailStudies = JSON.parse(detailRes.body?.patient?.studiesFiles || '[]')
        assert.equal(detailStudies[0]?.data, undefined)

        const listRes = await request(app)
            .get('/api/patients')
            .set('Cookie', cookieHeader)

        assert.equal(listRes.status, 200)
        const listedPatient = listRes.body?.patients?.find((p) => p.id === patientId)
        const listStudies = JSON.parse(listedPatient?.studiesFiles || '[]')
        assert.equal(listStudies[0]?.data, undefined)

        const downloadRes = await request(app)
            .get(`/api/patients/${patientId}/studies/study-file-1`)
            .set('Cookie', cookieHeader)

        assert.equal(downloadRes.status, 200)
        assert.equal(downloadRes.body?.file?.data, studyData)
    })

    test('studiesFiles legacy con base64 sigue funcionando y la respuesta no expone base64 gigante', async () => {
        const adminEmail = createTestEmail('admin-studies-legacy')
        const password = 'Password123!'
        await ensureUser({ email: adminEmail, password, role: 'ADMIN' })

        const { loginRes, csrfToken, cookieHeader } = await loginAndGetSession(app, {
            email: adminEmail,
            password
        })

        assert.equal(loginRes.status, 200)

        const legacyData = Buffer.from('archivo study legacy').toString('base64')
        const legacyPatient = await Patient.create({
            clinicId: 1,
            fullName: 'Paciente Studies Legacy',
            email: createTestEmail('patient-studies-legacy'),
            studiesFiles: JSON.stringify([
                {
                    id: 'legacy-study-1',
                    name: 'legacy-study.txt',
                    mime: 'text/plain',
                    data: legacyData,
                    description: 'Legacy Study',
                    createdAt: '2026-05-13T11:00:00.000Z',
                    uploadedBy: null
                }
            ])
        })

        const detailRes = await request(app)
            .get(`/api/patients/${legacyPatient.id}`)
            .set('Cookie', cookieHeader)

        assert.equal(detailRes.status, 200)
        const detailStudies = JSON.parse(detailRes.body?.patient?.studiesFiles || '[]')
        assert.equal(detailStudies[0]?.data, undefined)
        assert.equal(detailStudies[0]?.storageKey, undefined)

        const listRes = await request(app)
            .get('/api/patients')
            .set('Cookie', cookieHeader)

        assert.equal(listRes.status, 200)
        const listedPatient = listRes.body?.patients?.find((p) => p.id === legacyPatient.id)
        assert.ok(listedPatient)
        const listStudies = JSON.parse(listedPatient?.studiesFiles || '[]')
        assert.equal(listStudies[0]?.data, undefined)
        assert.equal(listStudies[0]?.storageKey, undefined)

        const downloadRes = await request(app)
            .get(`/api/patients/${legacyPatient.id}/studies/legacy-study-1`)
            .set('Cookie', cookieHeader)

        assert.equal(downloadRes.status, 200)
        assert.equal(downloadRes.body?.file?.data, legacyData)
    })
} else {
    test('crear y listar pacientes', { skip: true }, () => {})
    test('crear usuario odontologo desde admin crea perfil y permite /api/account/profile', { skip: true }, () => {})
    test('payments es la unica fuente de verdad para balance en listado, detalle y reporte', { skip: true }, () => {})
    test('implante nuevo guarda archivo sin base64 en DB y permite descarga', { skip: true }, () => {})
    test('implante legacy con base64 en DB sigue siendo descargable', { skip: true }, () => {})
    test('update de implante reemplaza archivo y limpia el storage anterior', { skip: true }, () => {})
    test('update de implante eliminando archivo quita referencia y limpia storage', { skip: true }, () => {})
    test('delete de implante limpia archivos en storage', { skip: true }, () => {})
    test('paciente nuevo con studiesFiles guarda storageKey sin base64 en DB y descarga funciona', { skip: true }, () => {})
    test('studiesFiles legacy con base64 sigue funcionando y la respuesta no expone base64 gigante', { skip: true }, () => {})
}
