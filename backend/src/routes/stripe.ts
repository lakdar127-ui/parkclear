import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
const stripe = stripeKey && stripeKey !== 'sk_test_'
  ? new Stripe(stripeKey, { apiVersion: '2024-06-20' })
  : null

const PRICES: Record<string, string | undefined> = {
  starter:  process.env.STRIPE_PRICE_STARTER,
  pro:      process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
}

function stripeReady(res: Response): boolean {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe non configuré — ajoutez STRIPE_SECRET_KEY dans .env' })
    return false
  }
  return true
}

// ── POST /api/stripe/checkout ────────────────────────────────
// Creates a Stripe Checkout session and returns the URL
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  if (!stripeReady(res)) return
  const authReq = req as AuthenticatedRequest

  const { plan } = req.body as { plan: 'starter' | 'pro' | 'business' }
  const priceId = PRICES[plan]

  if (!priceId || priceId === 'price_') {
    return res.status(400).json({ error: `Prix Stripe non configuré pour le plan "${plan}"` })
  }

  // Get org + customer
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', authReq.orgId!)
    .single()

  if (!org) return res.status(404).json({ error: 'Organisation introuvable' })

  // Get manager email
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(authReq.userId)
  const email = user?.email

  // Create or reuse Stripe customer
  let customerId = org.stripe_customer_id as string | null

  if (!customerId) {
    const customer = await stripe!.customers.create({
      name: org.name,
      email: email ?? undefined,
      metadata: { org_id: org.id },
    })
    customerId = customer.id

    await supabaseAdmin
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id)
  }

  const session = await stripe!.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/settings/subscription?success=1`,
    cancel_url:  `${process.env.FRONTEND_URL}/settings/subscription?cancelled=1`,
    metadata: { org_id: org.id, plan },
    subscription_data: {
      metadata: { org_id: org.id, plan },
    },
    locale: 'fr',
    allow_promotion_codes: true,
  })

  res.json({ url: session.url })
})

// ── POST /api/stripe/portal ──────────────────────────────────
// Opens Stripe Customer Portal (manage subscription / invoices)
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  if (!stripeReady(res)) return
  const authReq = req as AuthenticatedRequest

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', authReq.orgId!)
    .single()

  if (!org?.stripe_customer_id) {
    return res.status(400).json({ error: 'Aucun abonnement actif trouvé' })
  }

  const portal = await stripe!.billingPortal.sessions.create({
    customer: org.stripe_customer_id as string,
    return_url: `${process.env.FRONTEND_URL}/settings/subscription`,
  })

  res.json({ url: portal.url })
})

// ── POST /api/stripe/webhook ─────────────────────────────────
// Raw body is required — registered separately in index.ts
export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

  const sig = req.headers['stripe-signature'] as string
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  if (!secret || secret === 'whsec_') {
    return res.status(400).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret)
  } catch (err: any) {
    console.error('[stripe webhook] Signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  console.log(`[stripe webhook] Event: ${event.type}`)

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.org_id
      const plan  = session.metadata?.plan

      if (orgId && plan) {
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)

        await supabaseAdmin
          .from('organizations')
          .update({
            plan,
            plan_expires_at: expiresAt.toISOString(),
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', orgId)

        console.log(`[stripe webhook] Plan updated: org=${orgId} plan=${plan}`)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = sub.metadata?.org_id
      const plan  = sub.metadata?.plan

      if (orgId && plan && sub.status === 'active') {
        await supabaseAdmin
          .from('organizations')
          .update({
            plan,
            plan_expires_at: new Date(sub.current_period_end * 1000).toISOString(),
            stripe_subscription_id: sub.id,
          })
          .eq('id', orgId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = sub.metadata?.org_id

      if (orgId) {
        await supabaseAdmin
          .from('organizations')
          .update({ plan: 'trial', plan_expires_at: null, stripe_subscription_id: null })
          .eq('id', orgId)

        console.log(`[stripe webhook] Subscription cancelled: org=${orgId} → trial`)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.warn(`[stripe webhook] Payment failed for customer: ${invoice.customer}`)
      break
    }
  }

  res.json({ received: true })
}

export default router
