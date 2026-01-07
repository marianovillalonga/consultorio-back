import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transporter = null

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: env.mail.host,
            port: env.mail.port,
            secure: env.mail.port === 465,
            auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined
        })
    }
    return transporter
}

export const sendActivationEmail = async ({ to, link }) => {
    if (!env.mail.host || !env.mail.from) return
    const tx = getTransporter()
    await tx.sendMail({
        from: env.mail.from,
        to,
        subject: 'Activa tu cuenta',
        text: `Para activar tu cuenta, entra en: ${link}`,
        html: `
          <div style="font-family: Arial, sans-serif; background:#f3f6ff; padding:24px;">
            <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:24px; border:1px solid #e3e9f7;">
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                <div style="width:44px; height:44px; border-radius:12px; background:#e8efff; display:flex; align-items:center; justify-content:center; font-weight:700; color:#2f6bf0;">MV</div>
                <div>
                  <div style="font-weight:700; color:#0b1d3a;">Mariano Villalonga</div>
                  <div style="color:#6b7aa6; font-size:13px;">Odontologia Digital</div>
                </div>
              </div>
              <h2 style="margin:0 0 10px; color:#0b1d3a;">Activa tu cuenta</h2>
              <p style="margin:0 0 18px; color:#4a5a7a; line-height:1.5;">
                Para activar tu cuenta, hace click en el boton:
              </p>
              <a href="${link}" style="display:inline-block; background:#2f6bf0; color:#ffffff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:700;">
                Activar cuenta
              </a>
              <p style="margin:18px 0 0; color:#8a96b0; font-size:12px;">
                Si no solicitaste esta cuenta, ignora este mensaje.
              </p>
            </div>
          </div>
        `
    })
}
