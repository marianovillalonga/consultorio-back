const start = async () => {
    try {
        const [{ default: app }, { env }, { sequelize }] = await Promise.all([
            import('./app.js'),
            import('./config/env.js'),
            import('./db/sequelize.js')
        ])

        await import('./models/index.js')
        await sequelize.authenticate()
        app.listen(env.port, () => console.log(`API en puerto ${env.port}`))
    } catch (err) {
        console.error('[startup] Error al iniciar', err)
        process.exit(1)
    }
}

start()
