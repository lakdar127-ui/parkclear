import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'
import { sendWelcomeEmail, sendAgentInviteEmail } from '../lib/resend'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'

const router = Router()

// POST /api/auth/complete-signup
// Appelé après la vérification email — crée l'organisation initiale
const completeSignupSchema = z.object({
  full_name: z.string().min(2).max(100),
})

router.post('/complete-signup', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  const parsed = completeSignupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  // Vérifier que le profil n'a pas déjà une org
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', authReq.userId)
    .single()

  if (profile?.organization_id) {
    return res.status(409).json({ error: 'Organization already exists' })
  }

  // Mettre à jour le nom
  await supabaseAdmin
    .from('profiles')
    .update({ full_name: parsed.data.full_name })
    .eq('id', authReq.userId)

  res.json({ ok: true })
})

// POST /api/auth/invite-agent
// Inviter un agent terrain
const inviteSchema = z.object({
  email: z.string().email(),
  site_id: z.string().uuid().optional(),
})

router.post('/invite-agent', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })
  if (authReq.userRole === 'agent') return res.status(403).json({ error: 'Insufficient permissions' })

  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('name')
    .eq('id', authReq.orgId)
    .single()

  // Créer l'invitation Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        organization_id: authReq.orgId,
        role: 'agent',
        invited_site_id: parsed.data.site_id,
      },
      redirectTo: `${process.env.FRONTEND_URL}/auth/accept-invite`,
    }
  )

  if (error) return res.status(400).json({ error: error.message })

  await sendAgentInviteEmail(
    parsed.data.email,
    org?.name ?? 'ParkClear',
    `${process.env.FRONTEND_URL}/auth/accept-invite`
  )

  res.json({ ok: true, user_id: data.user?.id })
})

export default router
