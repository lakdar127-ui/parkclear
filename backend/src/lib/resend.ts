import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'ParkClear <notifications@parkclear.fr>'

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Bienvenue sur ParkClear 🎉',
    html: `
      <h2>Bonjour ${name},</h2>
      <p>Votre compte ParkClear est activé. Votre essai gratuit de 30 jours commence maintenant.</p>
      <p>
        <a href="${process.env.FRONTEND_URL}/dashboard"
           style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Accéder au dashboard →
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">
        Des questions ? Répondez directement à cet email — nous répondons en moins de 24h.
      </p>
    `,
  })
}

export async function sendAgentInviteEmail(
  to: string,
  orgName: string,
  inviteUrl: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Vous êtes invité à rejoindre ${orgName} sur ParkClear`,
    html: `
      <h2>Invitation ParkClear</h2>
      <p><strong>${orgName}</strong> vous invite à rejoindre ParkClear en tant qu'agent terrain.</p>
      <p>
        <a href="${inviteUrl}"
           style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Accepter l'invitation →
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">Ce lien expire dans 7 jours.</p>
    `,
  })
}
