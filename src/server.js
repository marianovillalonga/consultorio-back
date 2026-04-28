import logger from './lib/logger.js'

const start = async () => {
    try {
        const [{ default: app }, { env }, { sequelize }] = await Promise.all([
            import('./app.js'),
            import('./config/env.js'),
            import('./db/sequelize.js')
        ])

        await import('./models/index.js')
        await sequelize.authenticate()
        app.listen(env.port, () => logger.info('server_started', { port: env.port }))
    } catch (err) {
        logger.error('server_start_failed', { error: err })
        process.exit(1)
    }
}

start()
