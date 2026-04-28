import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'
import {
    shouldRunE2E,
    connectDb,
    closeDb,
    createTestEmail,
    ensureUser,
    ensureDentist,
    loginAndGetSession
} from '../helpers/e2e.js'

if (shouldRunE2E()) {
    before(async () => {
        await connectDb()
    })

    after(async () => {
        await closeDb()
    })

    test('flujo e2e de negocio con aislamiento entre clinicas', async () => {
        const adminPassword = 'Password123!'

        const adminClinicA = await ensureUser({
            email: createTestEmail('admin-clinic-a'),
            password: adminPassword,
            role: 'ADMIN',
            clinicId: 1
        })
        const adminClinicB = await ensureUser({
            email: createTestEmail('admin-clinic-b'),
            password: adminPassword,
            role: 'ADMIN',
            clinicId: 2
        })
        const dentistUserA = await ensureUser({
            email: createTestEmail('dentist-clinic-a'),
            password: adminPassword,
            role: 'ODONTOLOGO',
            clinicId: 1
        })
        const dentistA = await ensureDentist({
            userId: dentistUserA.id,
            fullName: 'Odontologo Clinica A'
        })

        const adminASession = await loginAndGetSession(app, {
            email: adminClinicA.email,
            password: adminPassword
        })
        const adminBSession = await loginAndGetSession(app, {
            email: adminClinicB.email,
            password: adminPassword
        })

        assert.equal(adminASession.loginRes.status, 200)
        assert.equal(adminBSession.loginRes.status, 200)

        const patientEmail = createTestEmail('patient-clinic-a')
        const createPatientRes = await request(app)
            .post('/api/patients')
            .set('Cookie', adminASession.cookieHeader)
            .set('X-CSRF-Token', adminASession.csrfToken)
            .send({
                fullName: 'Paciente Flujo Real',
                email: patientEmail,
                dni: `DNI-${Date.now()}`
            })

        assert.equal(createPatientRes.status, 201)
        const patientId = createPatientRes.body?.patient?.id
        assert.ok(patientId)

        const startAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        startAt.setUTCHours(14, 0, 0, 0)
        const endAt = new Date(startAt.getTime() + 30 * 60 * 1000)

        const createAppointmentRes = await request(app)
            .post('/api/appointments')
            .set('Cookie', adminASession.cookieHeader)
            .set('X-CSRF-Token', adminASession.csrfToken)
            .send({
                dentistId: dentistA.id,
                patientId,
                startAt: startAt.toISOString(),
                endAt: endAt.toISOString(),
                reason: 'Consulta inicial'
            })

        assert.equal(createAppointmentRes.status, 201)
        assert.equal(createAppointmentRes.body?.appointment?.dentistId, dentistA.id)
        assert.equal(createAppointmentRes.body?.appointment?.patientId, patientId)

        const listAppointmentsRes = await request(app)
            .get('/api/appointments/my')
            .set('Cookie', adminASession.cookieHeader)

        assert.equal(listAppointmentsRes.status, 200)
        assert.ok(Array.isArray(listAppointmentsRes.body?.appointments))
        assert.ok(listAppointmentsRes.body.appointments.some((appointment) => appointment.patientId === patientId))

        const fileData = Buffer.from('estudio-paciente-clinica-a').toString('base64')
        const uploadStudyRes = await request(app)
            .patch(`/api/patients/${patientId}`)
            .set('Cookie', adminASession.cookieHeader)
            .set('X-CSRF-Token', adminASession.csrfToken)
            .send({
                studiesFiles: JSON.stringify([
                    {
                        id: 'study-file-1',
                        name: 'estudio.txt',
                        mime: 'text/plain',
                        data: fileData,
                        createdAt: new Date().toISOString(),
                        description: 'Archivo de estudio'
                    }
                ])
            })

        assert.equal(uploadStudyRes.status, 200)
        assert.ok(uploadStudyRes.body?.patient?.studiesFiles)

        const fileReadRes = await request(app)
            .get(`/api/patients/${patientId}/studies/study-file-1`)
            .set('Cookie', adminASession.cookieHeader)

        assert.equal(fileReadRes.status, 200)
        assert.equal(fileReadRes.body?.file?.data, fileData)

        const foreignPatientRes = await request(app)
            .get(`/api/patients/${patientId}`)
            .set('Cookie', adminBSession.cookieHeader)

        assert.equal(foreignPatientRes.status, 404)

        const foreignFileRes = await request(app)
            .get(`/api/patients/${patientId}/studies/study-file-1`)
            .set('Cookie', adminBSession.cookieHeader)

        assert.equal(foreignFileRes.status, 404)

        const foreignAppointmentsRes = await request(app)
            .get('/api/appointments/my')
            .set('Cookie', adminBSession.cookieHeader)

        assert.equal(foreignAppointmentsRes.status, 200)
        assert.ok(Array.isArray(foreignAppointmentsRes.body?.appointments))
        assert.equal(
            foreignAppointmentsRes.body.appointments.some((appointment) => appointment.patientId === patientId),
            false
        )
    })
} else {
    test('flujo e2e de negocio con aislamiento entre clinicas', { skip: true }, () => {})
}
