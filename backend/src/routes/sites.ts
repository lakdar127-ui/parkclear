import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase'
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth'

const router = Router()

const siteSchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  postal_code: z.string().regex(/^\d{5}$/),
  type: z.enum(['open', 'closed', 'mixed']),
  total_places: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
})

// GET /api/sites
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(404).json({ error: 'No organization' })

  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('*')
    .eq('organization_id', authReq.orgId)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/sites
router.post(
  '/',
  requireAuth,
  requireRole('manager', 'admin'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest
    if (!authReq.orgId) return res.status(404).json({ error: 'No organization' })

    const parsed = siteSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { data, error } = await supabaseAdmin
      .from('sites')
      .insert({ ...parsed.data, organization_id: authReq.orgId })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  }
)

// GET /api/sites/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest

  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('*, agent_sites(agent_id, profiles(full_name, role))')
    .eq('id', req.params.id)
    .eq('organization_id', authReq.orgId ?? '')
    .single()

  if (error || !data) return res.status(404).json({ error: 'Site not found' })
  res.json(data)
})

// PATCH /api/sites/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole('manager', 'admin'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest

    const parsed = siteSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { data, error } = await supabaseAdmin
      .from('sites')
      .update(parsed.data)
      .eq('id', req.params.id)
      .eq('organization_id', authReq.orgId ?? '')
      .select()
      .single()

    if (error || !data) return res.status(404).json({ error: 'Site not found' })
    res.json(data)
  }
)

// DELETE /api/sites/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole('manager', 'admin'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest

    const { error } = await supabaseAdmin
      .from('sites')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', authReq.orgId ?? '')

    if (error) return res.status(500).json({ error: error.message })
    res.status(204).send()
  }
)

// POST /api/sites/:id/agents — assigner un agent à un site
router.post(
  '/:id/agents',
  requireAuth,
  requireRole('manager', 'admin'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest
    const { agent_id } = z.object({ agent_id: z.string().uuid() }).parse(req.body)

    // Vérifier que l'agent appartient à la même org
    const { data: agentProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', agent_id)
      .single()

    if (agentProfile?.organization_id !== authReq.orgId) {
      return res.status(403).json({ error: 'Agent does not belong to this organization' })
    }

    const { error } = await supabaseAdmin
      .from('agent_sites')
      .upsert({ agent_id, site_id: req.params.id })

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json({ ok: true })
  }
)

export default router
