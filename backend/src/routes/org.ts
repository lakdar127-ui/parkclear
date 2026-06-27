import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'
import { sendWelcomeEmail } from '../lib/resend'
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth'

const router = Router()

// GET /api/org — infos de l'organisation
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(404).json({ error: 'No organization found' })

  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('id', authReq.orgId)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/org — créer l'organisation (onboarding étape 1)
const createOrgSchema = z.object({
  name: z.string().min(2).max(200),
  siret: z.string().regex(/^\d{14}$/).optional().or(z.literal('')),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  postal_code: z.string().regex(/^\d{5}$/),
  signer_name: z.string().min(2).max(100),
  signer_title: z.string().min(2).max(100),
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest

  // Vérifier qu'il n'y a pas déjà une org
  if (authReq.orgId) return res.status(409).json({ error: 'Organization already exists' })

  const parsed = createOrgSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  // Créer l'organisation
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      ...parsed.data,
      plan: 'trial',
      plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (orgError) return res.status(500).json({ error: orgError.message })

  // Rattacher le profil à l'org
  await supabaseAdmin
    .from('profiles')
    .update({ organization_id: org.id, role: 'manager' })
    .eq('id', authReq.userId)

  // Email de bienvenue
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', authReq.userId)
    .single()

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(authReq.userId)
  if (user?.user?.email) {
    await sendWelcomeEmail(user.user.email, profile?.full_name ?? 'là').catch(console.error)
  }

  res.status(201).json(org)
})

// PATCH /api/org — mettre à jour l'organisation
const updateOrgSchema = createOrgSchema.partial()

router.patch(
  '/',
  requireAuth,
  requireRole('manager', 'admin'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest
    if (!authReq.orgId) return res.status(404).json({ error: 'No organization' })

    const parsed = updateOrgSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(parsed.data)
      .eq('id', authReq.orgId)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  }
)

export default router
