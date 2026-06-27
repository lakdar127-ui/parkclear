import { Router, Request, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase'
import { generateLrar, generateOPJDossier, LrarData, OPJData } from '../lib/pdf'

const router = Router()

// ── Helpers ──────────────────────────────────────────────────
async function fetchDossierFull(dossierId: string, orgId: string) {
  const { data: dossier, error } = await supabaseAdmin
    .from('dossiers')
    .select(`*, sites(id, name, address, city, postal_code), photos(id)`)
    .eq('id', dossierId)
    .eq('organization_id', orgId)
    .single()

  if (error || !dossier) return null

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('name, address, city, postal_code, signer_name, signer_title')
    .eq('id', orgId)
    .single()

  return { dossier, org, site: dossier.sites }
}

function streamPDF(res: Response, doc: PDFKit.PDFDocument, filename: string) {
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  doc.pipe(res)
}

// ── GET /api/documents/lrar/:id ──────────────────────────────
router.get('/lrar/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const result = await fetchDossierFull(req.params.id, authReq.orgId)
  if (!result || !result.org || !result.site) {
    return res.status(404).json({ error: 'Dossier introuvable ou organisation incomplète' })
  }

  const { dossier, org, site } = result
  const allowed = ['validated', 'lrar_sent', 'deadline_running', 'deadline_expired', 'opj_contacted', 'removal_scheduled', 'resolved']

  if (!allowed.includes(dossier.status)) {
    return res.status(400).json({ error: 'Le dossier doit être validé avant de générer la LRAR' })
  }

  const data: LrarData = {
    org: {
      name: org.name ?? '',
      address: org.address ?? '',
      city: org.city ?? '',
      postal_code: org.postal_code ?? '',
      signer_name: org.signer_name ?? 'Le Gestionnaire',
      signer_title: org.signer_title ?? '',
    },
    site: { name: site.name, address: site.address, city: site.city, postal_code: site.postal_code },
    dossier: {
      id: dossier.id,
      plate: dossier.plate,
      no_plate: dossier.no_plate,
      vehicle_type: dossier.vehicle_type,
      vehicle_brand: dossier.vehicle_brand,
      vehicle_color: dossier.vehicle_color,
      location_spot: dossier.location_spot,
      created_at: dossier.created_at,
    },
  }

  const plate = (dossier.plate ?? 'SANSPLAQUE').replace(/[^A-Z0-9]/g, '')
  const doc = generateLrar(data)
  streamPDF(res, doc, `LRAR_${plate}_${dossier.id.slice(0, 8).toUpperCase()}.pdf`)
})

// ── GET /api/documents/opj/:id ───────────────────────────────
router.get('/opj/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const result = await fetchDossierFull(req.params.id, authReq.orgId)
  if (!result || !result.org || !result.site) {
    return res.status(404).json({ error: 'Dossier introuvable ou organisation incomplète' })
  }

  const { dossier, org, site } = result

  const timeline: { date: string; action: string }[] = [
    {
      date: new Date(dossier.created_at).toLocaleDateString('fr-FR'),
      action: `Constatation du véhicule et signalement photographique (${(dossier.photos as any[]).length} photo(s))`,
    },
  ]

  if (dossier.lrar_sent_at) {
    timeline.push({
      date: new Date(dossier.lrar_sent_at).toLocaleDateString('fr-FR'),
      action: 'Envoi de la lettre recommandée avec accusé de réception (LRAR) au propriétaire du véhicule',
    })
  }

  if (dossier.deadline_at) {
    timeline.push({
      date: new Date(dossier.deadline_at).toLocaleDateString('fr-FR'),
      action: 'Expiration du délai de 10 jours — Aucune réponse ni déplacement du véhicule constaté',
    })
  }

  if (['opj_contacted', 'removal_scheduled', 'resolved'].includes(dossier.status)) {
    timeline.push({
      date: new Date(dossier.updated_at).toLocaleDateString('fr-FR'),
      action: "Saisine de l'OPJ compétent pour constater l'abandon du véhicule",
    })
  }

  const data: OPJData = {
    org: {
      name: org.name ?? '',
      address: org.address ?? '',
      city: org.city ?? '',
      postal_code: org.postal_code ?? '',
      signer_name: org.signer_name ?? 'Le Gestionnaire',
      signer_title: org.signer_title ?? '',
    },
    site: { name: site.name, address: site.address, city: site.city, postal_code: site.postal_code },
    dossier: {
      id: dossier.id,
      plate: dossier.plate,
      no_plate: dossier.no_plate,
      vehicle_type: dossier.vehicle_type,
      vehicle_brand: dossier.vehicle_brand,
      vehicle_color: dossier.vehicle_color,
      location_spot: dossier.location_spot,
      created_at: dossier.created_at,
      status: dossier.status,
      lrar_sent_at: dossier.lrar_sent_at,
      deadline_at: dossier.deadline_at,
      notes: dossier.notes,
      photos_count: (dossier.photos as any[]).length,
    },
    timeline,
  }

  const plate = (dossier.plate ?? 'SANSPLAQUE').replace(/[^A-Z0-9]/g, '')
  const doc = generateOPJDossier(data)
  streamPDF(res, doc, `DOSSIER_OPJ_${plate}_${dossier.id.slice(0, 8).toUpperCase()}.pdf`)
})

export default router
