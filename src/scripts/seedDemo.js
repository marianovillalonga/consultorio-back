import bcrypt from 'bcrypt'
import { sequelize } from '../db/sequelize.js'
import { env } from '../config/env.js'
import { User, Dentist, Patient, Availability } from '../models/index.js'

const ensureUser = async ({ email, password, role }) => {
    const existing = await User.findOne({ where: { email } })
    if (existing) return existing
    const passwordHash = await bcrypt.hash(password, 10)
    return User.create({ email, passwordHash, role })
}

const ensureDentist = async ({ userId, fullName, photoUrl, bio, specialties, license, specialty }) => {
    const existing = await Dentist.findOne({ where: { userId } })
    if (existing) return existing
    return Dentist.create({ userId, fullName, photoUrl, bio, specialties, license, specialty })
}

const ensurePatient = async ({ fullName, email }) => {
    const existing = await Patient.findOne({ where: { email } })
    if (existing) return existing
    return Patient.create({ fullName, email })
}

const setAvailability = async (dentistId) => {
    await Availability.destroy({ where: { dentistId } })
    return Availability.bulkCreate([
        { dentistId, weekday: 1, fromTime: '09:00', toTime: '13:00', slotMinutes: 30 }, // lunes
        { dentistId, weekday: 3, fromTime: '14:00', toTime: '18:00', slotMinutes: 30 }  // miércoles
    ])
}

const main = async () => {
    await sequelize.authenticate()

    const admin = await ensureUser({ email: 'admin@demo.com', password: 'admin123', role: 'ADMIN' })
    const dentUser = await ensureUser({ email: 'dentist@demo.com', password: 'secret123', role: 'ODONTOLOGO' })
    const patientUser = await ensureUser({ email: 'paciente@demo.com', password: 'patient123', role: 'PACIENTE' })

    const dentist = await ensureDentist({
        userId: dentUser.id,
        fullName: 'Doctor Demo',
        photoUrl: 'https://images.example.com/dentist-demo.jpg',
        bio: 'Especialista en ortodoncia y armonizacion facial.',
        specialties: JSON.stringify(['Ortodoncia', 'Estetica dental']),
        license: 'MAT-123',
        specialty: 'Ortodoncia'
    })
    await ensurePatient({ fullName: 'Paciente Demo', email: patientUser.email })
    await setAvailability(dentist.id)

    console.log('Seed demo listo:')
    console.log('- Admin: admin@demo.com / admin123')
    console.log('- Odontologo: dentist@demo.com / secret123 (especialidad Ortodoncia)')
    console.log('- Paciente: paciente@demo.com / patient123')
    console.log('- Disponibilidad: lunes 09-13, miércoles 14-18 (30m)')
    await sequelize.close()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
