import { Sequelize } from 'sequelize'
import mysql from 'mysql2'
import { env } from '../config/env.js'

const connectionUrl = process.env.DATABASE_URL ||  `mysql://${env.db.user}:${env.db.pass}@${env.db.host}:${env.db.port}/${env.db.name}`

export const sequelize = new Sequelize(connectionUrl, {
    dialect: 'mysql',
    dialectModule: mysql,
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
})