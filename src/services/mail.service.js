import { Resend } from 'resend'
import { env } from '../config/env.js'

const resend = new Resend(env.resend.apiKey)

export async function sendActivationEmail({ to, link }) {
  const from = env.mail.from || 'Odontologia <no-reply@tudominio.com>'
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'marianovillalonga94.mv@gmail.com',
    subject: 'Activa tu cuenta',
    html: `
      <div style="font-family: Arial, sans-serif; background:#f3f6ff; padding:24px;">
        <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:24px; border:1px solid #e3e9f7;">
          <h2 style="margin:0 0 10px; color:#0b1d3a;">Activa tu cuenta</h2>
          <p style="margin:0 0 18px; color:#4a5a7a;">Para activar tu cuenta, hace click en el botón:</p>
          <a href="${link}" style="display:inline-block; background:#2f6bf0; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:700;">Activar cuenta</a>
        </div>
      </div>`
  })
}
