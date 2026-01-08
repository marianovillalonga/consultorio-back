import { Resend } from 'resend'
import { env } from '../config/env.js'

const resend = new Resend(env.resend.apiKey)

export async function sendActivationEmail({ to, link }) {
  if (!env.resend.apiKey) {
    console.error('Falta RESEND_API_KEY')
    return
  }

  const from = env.mail.from || 'onboarding@resend.dev'

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: 'Activa tu cuenta',
      html: `
        <div style="font-family: Arial, sans-serif; background:#f3f6ff; padding:24px;">
          <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:24px; border:1px solid #e3e9f7;">
            <h2 style="margin:0 0 10px; color:#0b1d3a;">Activa tu cuenta</h2>
            <p style="margin:0 0 18px; color:#4a5a7a;">Para activar tu cuenta, hacé click en el botón:</p>
            <a href="${link}" style="display:inline-block; background:#2f6bf0; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:700;">
              Activar cuenta
            </a>
            <p style="margin-top:16px; color:#8a96b0; font-size:12px;">Si no solicitaste esta cuenta, ignorá este mensaje.</p>
          </div>
        </div>`
    })

    if (error) {
      console.error('Resend error:', error) // muestra status/message de Resend
      throw error
    }

    console.log('Email enviado. id:', data?.id)
    return data?.id
  } catch (e) {
    console.error('Fallo al enviar email:', e?.message || e)
    throw e
  }
}
