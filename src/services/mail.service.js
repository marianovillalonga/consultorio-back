import { Resend } from 'resend'
import { env } from '../config/env.js'
import logger from '../lib/logger.js'

const resend = new Resend(env.resend.apiKey)

export async function sendActivationEmail({ to, link }) {
  if (!env.resend.apiKey) {
    logger.error('mail_activation_missing_resend_api_key')
    return
  }

  const from = env.mail.from
  if (!from) {
    throw new Error('Falta MAIL_FROM (ej: "Consultorio <no-reply@send.consultorio.website>")')
  }

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
      logger.error('mail_activation_provider_error', { error })
      throw error
    }

    logger.info('mail_activation_sent', { emailProviderId: data?.id || null, to })
    return data?.id
  } catch (e) {
    logger.error('mail_activation_send_failed', { error: e, to })
    throw e
  }
}

export async function sendPasswordResetEmail({ to, link }) {
  if (!env.resend.apiKey) {
    logger.error('mail_reset_missing_resend_api_key')
    return
  }

  const from = env.mail.from
  if (!from) {
    throw new Error('Falta MAIL_FROM (ej: "Consultorio <no-reply@send.consultorio.website>")')
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: 'Restablece tu contrasena',
      html: `
        <div style="font-family: Arial, sans-serif; background:#f3f6ff; padding:24px;">
          <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:24px; border:1px solid #e3e9f7;">
            <h2 style="margin:0 0 10px; color:#0b1d3a;">Restablece tu contrasena</h2>
            <p style="margin:0 0 18px; color:#4a5a7a;">Para elegir una nueva contrasena, hace click en el boton:</p>
            <a href="${link}" style="display:inline-block; background:#2f6bf0; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:700;">
              Cambiar contrasena
            </a>
            <p style="margin-top:16px; color:#8a96b0; font-size:12px;">Si no solicitaste este cambio, ignora este mensaje.</p>
          </div>
        </div>`
    })

    if (error) {
      logger.error('mail_reset_provider_error', { error })
      throw error
    }

    logger.info('mail_reset_sent', { emailProviderId: data?.id || null, to })
    return data?.id
  } catch (e) {
    logger.error('mail_reset_send_failed', { error: e, to })
    throw e
  }
}
