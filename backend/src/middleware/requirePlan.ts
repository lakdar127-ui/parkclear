import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { AuthenticatedRequest } from './auth'

const PLAN_LIMITS = {
  trial:    { maxActiveDossiers: 3,  maxSites: 1, maxAgents: 2 },
  starter:  { maxActiveDossiers: 5,  maxSites: 1, maxAgents: 2 },
  pro:      { maxActiveDossiers: 20, maxSites: 5, maxAgents: 10 },
  business: { maxActiveDossiers: Infinity, maxSites: Infinity, maxAgents: Infinity },
}

// Vérifier la limite de dossiers actifs avant création
export async function checkDossierLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authReq = req as AuthenticatedRequest
  if (!authReq.orgId) return res.status(403).json({ error: 'No organization' })

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('plan')
    .eq('id', authReq.orgId)
    .single()

  const plan = (org?.plan ?? 'trial') as keyof typeof PLAN_LIMITS
  const limits = PLAN_LIMITS[plan]

  const { count } = await supabaseAdmin
    .from('dossiers')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', authReq.orgId)
    .not('status', 'in', '("resolved","cancelled")')

  if ((count ?? 0) >= limits.maxActiveDossiers) {
    return res.status(402).json({
      error: 'Plan limit reached',
      code: 'DOSSIER_LIMIT',
      limit: limits.maxActiveDossiers,
      current: count,
      upgrade_url: `${process.env.FRONTEND_URL}/settings/subscription`,
    })
  }

  next()
}
