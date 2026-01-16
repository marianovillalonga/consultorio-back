import app from './app.js'
import { env } from './config/env.js'
import { sequelize } from './db/sequelize.js'
import './models/index.js'

const start = async () => {
    try {
        await sequelize.authenticate()
        app.listen(env.port, () => console.log(`🚀 API en puerto ${env.port}`))
    } catch (err) {
        console.error('[startup] Error al iniciar', err)
        process.exit(1)
    }
}

start()

