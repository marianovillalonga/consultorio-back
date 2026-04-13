import { Sequelize } from 'sequelize'
import mysql from 'mysql2'
import { env } from '../config/env.js'

const baseOptions = {
    dialect: 'mysql',
    dialectModule: mysql,
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
}

const buildConfig = () => {
    if (env.databaseUrl) {
        const url = new URL(env.databaseUrl)

        return {
            ...baseOptions,
            host: url.hostname,
            port: Number(url.port || 3306),
            database: url.pathname.replace(/^\//, ''),
            username: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password)
        }
    }

    return {
        ...baseOptions,
        host: env.db.host,
        port: env.db.port,
        database: env.db.name,
        username: env.db.user,
        password: env.db.pass
    }
}

export const sequelize = new Sequelize(buildConfig())
