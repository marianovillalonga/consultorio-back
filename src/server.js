import app from './app.js'
import { env } from './config/env.js'
import { sequelize } from './db/sequelize.js'
import './models/index.js'

const start = async () => {
    await sequelize.authenticate()
    await sequelize.sync() 
    app.listen(env.port, () => console.log(`🚀 API en puerto ${env.port}`))
}

start()
