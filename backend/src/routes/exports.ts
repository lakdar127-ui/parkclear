import { Router, Request, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(headers: string[], rows: string[][]): string {
  const head = headers.map(escapeCSV).join(',')
  const body = rows.map((r) => r.map(escapeCSV).join(',')).join('\n')
  return `\uFEFF${head}\n${body}` // BOM for Excel UTF-8
}

// ── GET /api/exports/dossiers ────────────────────────────────
router.get('/dossiers', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const { site_id, status, from, to } = req.query as Record<string, string>

  let query = supabaseAdmin
    .from('dossiers')
    .select(`
      id, plate, no_plate, vehicle_type, vehicle_brand, vehicle_color,
      location_spot, status, lrar_sent_at, deadline_at, notes,
      created_at, updated_at,
      sites(name, address, city),
      profiles!created_by(full_name)
    `)
    .eq('organization_id', authReq.orgId)
    .order('created_at', { ascending: false })

  if (site_id) query = query.eq('site_id', site_id)
  if (status)  query = query.eq('status', status)
  if (from)    query = query.gte('created_at', new Date(from).toISOString())
  if (to)      query = query.lte('created_at', new Date(to).toISOString())

  const { data, error } = await query

  if (error) return res.status(500).json({ error: error.message })

  const STATUS_LABELS: Record<string, string> = {
    open:              'En attente',
    validated:         'Validé',
    lrar_sent:         'LRAR envoyée',
    deadline_running:  'Délai en cours',
    deadline_expired:  'Délai expiré',
    opj_contacted:     'OPJ saisi',
    removal_scheduled: 'Enlèvement prévu',
    resolved:          'Résolu',
    cancelled:         'Annulé',
  }

  const headers = [
    'ID', 'Plaque', 'Sans plaque', 'Type', 'Marque', 'Couleur',
    'Parking', 'Adresse parking', 'Ville parking', 'Numéro de place',
    'Statut', 'Agent', 'LRAR envoyée le', 'Délai expire le',
    'Date création', 'Dernière modification', 'Notes',
  ]

  const rows = (data ?? []).map((d) => {
    const site = d.sites as any
    const profile = (d.profiles as any)

    return [
      d.id.slice(0, 8).toUpperCase(),
      d.plate ?? '',
      d.no_plate ? 'Oui' : 'Non',
      d.vehicle_type === 'va' ? 'Véhicule Abandonné' : d.vehicle_type === 'epave' ? 'Épave' : 'Inconnu',
      d.vehicle_brand ?? '',
      d.vehicle_color ?? '',
      site?.name ?? '',
      site?.address ?? '',
      site?.city ?? '',
      d.location_spot ?? '',
      STATUS_LABELS[d.status] ?? d.status,
      profile?.full_name ?? '',
      d.lrar_sent_at ? new Date(d.lrar_sent_at).toLocaleDateString('fr-FR') : '',
      d.deadline_at  ? new Date(d.deadline_at).toLocaleDateString('fr-FR')  : '',
      new Date(d.created_at).toLocaleDateString('fr-FR'),
      new Date(d.updated_at).toLocaleDateString('fr-FR'),
      d.notes ?? '',
    ]
  })

  const csv = toCSV(headers, rows)
  const date = new Date().toISOString().slice(0, 10)
  const filename = `parkclear-dossiers-${date}.csv`

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
})

// ── GET /api/exports/sites ───────────────────────────────────
router.get('/sites', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id, name, address, city, postal_code, type, total_places, notes, created_at')
    .eq('organization_id', authReq.orgId)
    .order('name')

  if (error) return res.status(500).json({ error: error.message })

  const headers = ['ID', 'Nom', 'Adresse', 'Ville', 'Code postal', 'Type', 'Nb places', 'Notes', 'Créé le']
  const rows = (data ?? []).map((s) => [
    s.id.slice(0, 8).toUpperCase(),
    s.name,
    s.address,
    s.city,
    s.postal_code,
    s.type === 'open' ? 'Ouvert' : s.type === 'closed' ? 'Fermé' : 'Mixte',
    s.total_places ?? '',
    s.notes ?? '',
    new Date(s.created_at).toLocaleDateString('fr-FR'),
  ])

  const csv = toCSV(headers, rows)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="parkclear-parkings-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csv)
})

export default router
