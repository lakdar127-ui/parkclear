import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

router.get('/', async (_req, res) => {
  const start = Date.now()
  let dbStatus = 'ok'
  let dbLatency = 0

  try {
    await supabaseAdmin.from('organizations').select('id').limit(1)
    dbLatency = Date.now() - start
  } catch {
    dbStatus = 'error'
  }

  const stripeConfigured  = !!(process.env.STRIPE_SECRET_KEY  && process.env.STRIPE_SECRET_KEY  !== 'sk_test_')
  const resendConfigured  = !!(process.env.RESEND_API_KEY     && process.env.RESEND_API_KEY     !== 're_')
  const webhookConfigured = !!(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_')

  const status = dbStatus === 'ok' ? 200 : 503

  res.status(status).json({
    status:    dbStatus === 'ok' ? 'ok' : 'degraded',
    version:   '1.0.0',
    env:       process.env.NODE_ENV,
    uptime:    Math.floor(process.uptime()),
    db:        { status: dbStatus, latency_ms: dbLatency },
    services: {
      stripe:  stripeConfigured  ? 'configured' : 'missing',
      resend:  resendConfigured  ? 'configured' : 'missing',
      webhook: webhookConfigured ? 'configured' : 'missing',
    },
    timestamp: new Date().toISOString(),
  })
})

export default router
