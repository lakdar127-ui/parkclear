import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'

export interface AuthenticatedRequest extends Request {
  userId: string
  orgId: string | null
  userRole: string
  accessToken: string
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  const token = authHeader.slice(7)

  // Vérifier le JWT via Supabase
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Récupérer le profil
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const authReq = req as AuthenticatedRequest
  authReq.userId = user.id
  authReq.orgId = profile?.organization_id ?? null
  authReq.userRole = profile?.role ?? 'agent'
  authReq.accessToken = token

  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest
    if (!roles.includes(authReq.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
