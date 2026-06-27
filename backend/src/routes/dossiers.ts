import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { checkDossierLimit } from '../middleware/requirePlan'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

// ── Schemas ─────────────────────────────────────────────────
const createDossierSchema = z.object({
  site_id:        z.string().uuid(),
  plate:          z.string().max(20).optional(),
  no_plate:       z.boolean().optional().default(false),
  vehicle_type:   z.enum(['va', 'epave', 'unknown']).default('unknown'),
  vehicle_brand:  z.string().max(50).optional(),
  vehicle_model:  z.string().max(50).optional(),
  vehicle_color:  z.string().max(30).optional(),
  location_spot:  z.string().max(20).optional(),
  location_notes: z.string().max(500).optional(),
  notes:          z.string().max(1000).optional(),
})

const updateDossierSchema = z.object({
  status:          z.enum([
    'open', 'validated', 'lrar_sent', 'deadline_running',
    'deadline_expired', 'opj_contacted', 'removal_scheduled',
    'resolved', 'cancelled',
  ]).optional(),
  plate:           z.string().max(20).optional(),
  vehicle_brand:   z.string().max(50).optional(),
  vehicle_model:   z.string().max(50).optional(),
  vehicle_color:   z.string().max(30).optional(),
  vehicle_type:    z.enum(['va', 'epave', 'unknown']).optional(),
  location_spot:   z.string().max(20).optional(),
  location_notes:  z.string().max(500).optional(),
  notes:           z.string().max(1000).optional(),
  lrar_sent_at:    z.string().datetime().optional(),
  deadline_at:     z.string().datetime().optional(),
})

const addPhotoSchema = z.object({
  storage_path: z.string().min(1),
  photo_type:   z.enum(['plate', 'front', 'side', 'rear', 'damage', 'general']),
  taken_at:     z.string().datetime().optional(),
})

// ── GET /api/dossiers ────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const { site_id, status, limit = '50', offset = '0' } = req.query as Record<string, string>

  let query = supabaseAdmin
    .from('dossiers')
    .select(`
      id, plate, no_plate, vehicle_type, vehicle_brand, vehicle_color,
      location_spot, status, lrar_sent_at, deadline_at, created_at, updated_at,
      sites(id, name),
      profiles!created_by(full_name)
    `)
    .eq('organization_id', authReq.orgId)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (site_id) query = query.eq('site_id', site_id)
  if (status)  query = query.eq('status', status)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ dossiers: data, total: data?.length ?? 0 })
})

// ── POST /api/dossiers ───────────────────────────────────────
router.post('/', requireAuth, checkDossierLimit, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const parsed = createDossierSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data: body } = parsed

  const { data: site } = await supabaseAdmin
    .from('sites')
    .select('id')
    .eq('id', body.site_id)
    .eq('organization_id', authReq.orgId)
    .single()

  if (!site) return res.status(403).json({ error: 'Site not found or access denied' })

  const { data, error } = await supabaseAdmin
    .from('dossiers')
    .insert({
      organization_id: authReq.orgId,
      site_id:         body.site_id,
      created_by:      authReq.userId,
      plate:           body.plate ?? null,
      no_plate:        body.no_plate,
      vehicle_type:    body.vehicle_type,
      vehicle_brand:   body.vehicle_brand ?? null,
      vehicle_model:   body.vehicle_model ?? null,
      vehicle_color:   body.vehicle_color ?? null,
      location_spot:   body.location_spot ?? null,
      location_notes:  body.location_notes ?? null,
      notes:           body.notes ?? null,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ dossier: data })
})

// ── GET /api/dossiers/:id ────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const { data, error } = await supabaseAdmin
    .from('dossiers')
    .select(`
      *,
      sites(id, name, address, city),
      profiles!created_by(full_name, phone),
      photos(id, storage_path, photo_type, taken_at)
    `)
    .eq('id', req.params.id)
    .eq('organization_id', authReq.orgId)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Dossier not found' })
  res.json({ dossier: data })
})

// ── PATCH /api/dossiers/:id ──────────────────────────────────
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const parsed = updateDossierSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data: existing } = await supabaseAdmin
    .from('dossiers')
    .select('id, status')
    .eq('id', req.params.id)
    .eq('organization_id', authReq.orgId)
    .single()

  if (!existing) return res.status(404).json({ error: 'Dossier not found' })

  const { data, error } = await supabaseAdmin
    .from('dossiers')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ dossier: data })
})

// ── POST /api/dossiers/:id/photos ────────────────────────────
router.post('/:id/photos', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const parsed = addPhotoSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { data: dossier } = await supabaseAdmin
    .from('dossiers')
    .select('id')
    .eq('id', req.params.id)
    .eq('organization_id', authReq.orgId)
    .single()

  if (!dossier) return res.status(404).json({ error: 'Dossier not found' })

  const { data, error } = await supabaseAdmin
    .from('photos')
    .insert({
      dossier_id:   req.params.id,
      storage_path: parsed.data.storage_path,
      photo_type:   parsed.data.photo_type,
      taken_at:     parsed.data.taken_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ photo: data })
})

// ── DELETE /api/dossiers/:id ─────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const { data: existing } = await supabaseAdmin
    .from('dossiers')
    .select('id, status, created_by')
    .eq('id', req.params.id)
    .eq('organization_id', authReq.orgId)
    .single()

  if (!existing) return res.status(404).json({ error: 'Dossier not found' })

  if (existing.created_by !== authReq.userId && authReq.userRole !== 'manager' && authReq.userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { error } = await supabaseAdmin
    .from('dossiers')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).send()
})

export default router
