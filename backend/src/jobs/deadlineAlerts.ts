import cron from 'node-cron'
import { supabaseAdmin } from '../lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'ParkClear <notifications@parkclear.fr>'

// ── Expire deadlines ─────────────────────────────────────────
async function expireDeadlines() {
  const now = new Date().toISOString()

  // Find dossiers where deadline passed and status is still deadline_running
  const { data: expired, error } = await supabaseAdmin
    .from('dossiers')
    .select('id, deadline_at, organization_id, plate, vehicle_type, sites(name)')
    .eq('status', 'deadline_running')
    .lt('deadline_at', now)

  if (error) {
    console.error('[deadlineAlerts] Error fetching expired:', error.message)
    return
  }

  if (!expired || expired.length === 0) return

  console.log(`[deadlineAlerts] ${expired.length} dossier(s) à expirer`)

  for (const dossier of expired) {
    await supabaseAdmin
      .from('dossiers')
      .update({ status: 'deadline_expired', updated_at: new Date().toISOString() })
      .eq('id', dossier.id)

    await sendDeadlineExpiredAlert(dossier)
  }
}

// ── Send approaching deadline alerts (D-1) ───────────────────
async function sendApproachingAlerts() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString()
  const tomorrowEnd   = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString()

  const { data: approaching } = await supabaseAdmin
    .from('dossiers')
    .select('id, deadline_at, organization_id, plate, vehicle_type, sites(name)')
    .eq('status', 'deadline_running')
    .gte('deadline_at', tomorrowStart)
    .lte('deadline_at', tomorrowEnd)

  if (!approaching || approaching.length === 0) return

  console.log(`[deadlineAlerts] ${approaching.length} alerte(s) D-1 à envoyer`)

  for (const dossier of approaching) {
    await sendApproachingAlert(dossier)
  }
}

// ── Email helpers ─────────────────────────────────────────────
async function getManagerEmail(orgId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('organization_id', orgId)
    .in('role', ['manager', 'admin'])
    .limit(1)
    .single()

  if (!data) return null

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.id)
  return userData?.user?.email ?? null
}

async function sendDeadlineExpiredAlert(dossier: any) {
  const email = await getManagerEmail(dossier.organization_id)
  if (!email || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_') return

  const siteName = (dossier.sites as any)?.name ?? 'site inconnu'
  const plate = dossier.plate ?? 'sans plaque'
  const dashboardUrl = `${process.env.FRONTEND_URL}/dossiers/${dossier.id}`

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `⚠️ Délai expiré — ${plate} · ${siteName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#dc2626;padding:16px 24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">⚠️ Délai expiré — Action requise</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="color:#374151">Le délai de 10 jours est écoulé pour le dossier suivant :</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr>
                <td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280;width:40%">Plaque</td>
                <td style="padding:8px 12px;font-size:13px;color:#111827;font-weight:600">${plate.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280">Type</td>
                <td style="padding:8px 12px;font-size:13px;color:#111827">${dossier.vehicle_type === 'epave' ? 'Épave' : 'Véhicule abandonné'}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f9fafb;font-size:13px;color:#6b7280">Parking</td>
                <td style="padding:8px 12px;font-size:13px;color:#111827">${siteName}</td>
              </tr>
            </table>
            <p style="color:#374151">
              <strong>Prochaine étape :</strong> Contactez un OPJ (Officier de Police Judiciaire) compétent
              pour constater l'abandon et autoriser l'enlèvement.
            </p>
            <a href="${dashboardUrl}"
               style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px">
              Voir le dossier →
            </a>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px">
            ParkClear · Gestion automatisée des véhicules abandonnés
          </p>
        </div>
      `,
    })
  } catch (err: any) {
    console.error('[deadlineAlerts] Email send failed:', err.message)
  }
}

async function sendApproachingAlert(dossier: any) {
  const email = await getManagerEmail(dossier.organization_id)
  if (!email || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_') return

  const siteName = (dossier.sites as any)?.name ?? 'site inconnu'
  const plate = dossier.plate ?? 'sans plaque'
  const dashboardUrl = `${process.env.FRONTEND_URL}/dossiers/${dossier.id}`

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `⏱ Délai expire demain — ${plate} · ${siteName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#d97706;padding:16px 24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">⏱ Délai expire demain</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="color:#374151">Le délai de 10 jours expire <strong>demain</strong> pour :</p>
            <p style="background:#fef3c7;padding:12px 16px;border-radius:6px;font-weight:600;color:#92400e">
              ${plate.toUpperCase()} · ${siteName}
            </p>
            <p style="color:#374151">
              Préparez le contact OPJ et le dossier de signalement si le propriétaire n'a pas répondu.
            </p>
            <a href="${dashboardUrl}"
               style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
              Voir le dossier →
            </a>
          </div>
        </div>
      `,
    })
  } catch (err: any) {
    console.error('[deadlineAlerts] Approaching alert failed:', err.message)
  }
}

// ── Register cron jobs ───────────────────────────────────────
export function startDeadlineJobs() {
  // Every hour — check for expired deadlines
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] Checking expired deadlines...')
    await expireDeadlines()
  })

  // Every day at 9:00 AM — send D-1 alerts
  cron.schedule('0 9 * * *', async () => {
    console.log('[cron] Sending D-1 approaching alerts...')
    await sendApproachingAlerts()
  })

  console.log('[cron] Deadline jobs registered (hourly expiry + daily D-1 alert at 9h)')
}
