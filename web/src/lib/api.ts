import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL as string

async function getHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Org ─────────────────────────────────────────────────────
export const api = {
  org: {
    get: () => request<Organization>('/api/org'),
    create: (data: CreateOrgPayload) =>
      request<Organization>('/api/org', { method: 'POST', body: JSON.stringify(data) }),
    update: (data: Partial<CreateOrgPayload>) =>
      request<Organization>('/api/org', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  sites: {
    list: () => request<Site[]>('/api/sites'),
    get: (id: string) => request<Site>(`/api/sites/${id}`),
    create: (data: CreateSitePayload) =>
      request<Site>('/api/sites', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateSitePayload>) =>
      request<Site>(`/api/sites/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/sites/${id}`, { method: 'DELETE' }),
  },

  auth: {
    inviteAgent: (email: string, siteId?: string) =>
      request<{ ok: boolean }>('/api/auth/invite-agent', {
        method: 'POST',
        body: JSON.stringify({ email, site_id: siteId }),
      }),
  },

  stripe: {
    createCheckout: (plan: 'starter' | 'pro' | 'business') =>
      request<{ url: string }>('/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
    openPortal: () =>
      request<{ url: string }>('/api/stripe/portal', { method: 'POST', body: '{}' }),
  },

  exports: {
    dossiersUrl: (params?: { site_id?: string; status?: string; from?: string; to?: string }) => {
      const base = `${API_URL}/api/exports/dossiers`
      if (!params) return base
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v).map(([k, v]) => [k, v!])
      ).toString()
      return qs ? `${base}?${qs}` : base
    },
    sitesUrl: () => `${API_URL}/api/exports/sites`,
  },

  dossiers: {
    list: (params?: { site_id?: string; status?: string; limit?: number; offset?: number }) => {
      const qs = params
        ? '?' + new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          ).toString()
        : ''
      return request<{ dossiers: Dossier[]; total: number }>(`/api/dossiers${qs}`)
        .then((r) => r.dossiers)
    },
    get: (id: string) =>
      request<{ dossier: DossierDetail }>(`/api/dossiers/${id}`)
        .then((r) => r.dossier),
    create: (data: CreateDossierPayload) =>
      request<{ dossier: Dossier }>('/api/dossiers', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((r) => r.dossier),
    update: (id: string, data: UpdateDossierPayload) =>
      request<{ dossier: Dossier }>(`/api/dossiers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then((r) => r.dossier),
    cancel: (id: string) =>
      request<void>(`/api/dossiers/${id}`, { method: 'DELETE' }),
  },

  agents: {
    invite: (email: string, siteId?: string) =>
      request<{ ok: boolean }>('/api/auth/invite-agent', {
        method: 'POST',
        body: JSON.stringify({ email, site_id: siteId }),
      }),
  },
}

// ── Types ────────────────────────────────────────────────────
export interface Organization {
  id: string
  name: string
  siret?: string
  address?: string
  city?: string
  postal_code?: string
  signer_name?: string
  signer_title?: string
  plan: 'trial' | 'starter' | 'pro' | 'business'
  plan_expires_at?: string
  created_at: string
}

export interface Site {
  id: string
  organization_id: string
  name: string
  address: string
  city: string
  postal_code: string
  type: 'open' | 'closed' | 'mixed'
  total_places?: number
  notes?: string
  created_at: string
}

export interface CreateOrgPayload {
  name: string
  siret?: string
  address: string
  city: string
  postal_code: string
  signer_name: string
  signer_title: string
}

export interface CreateSitePayload {
  name: string
  address: string
  city: string
  postal_code: string
  type: 'open' | 'closed' | 'mixed'
  total_places?: number
  notes?: string
}

export type DossierStatus =
  | 'open' | 'validated' | 'lrar_sent' | 'deadline_running'
  | 'deadline_expired' | 'opj_contacted' | 'removal_scheduled'
  | 'resolved' | 'cancelled'

export type VehicleType = 'va' | 'epave' | 'unknown'

export interface Dossier {
  id: string
  organization_id: string
  site_id: string
  created_by: string
  plate: string | null
  no_plate: boolean
  vehicle_type: VehicleType
  vehicle_brand: string | null
  vehicle_color: string | null
  location_spot: string | null
  status: DossierStatus
  lrar_sent_at: string | null
  deadline_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  sites: { id: string; name: string } | null
  profiles: { full_name: string | null } | null
}

export interface DossierPhoto {
  id: string
  dossier_id: string
  storage_path: string
  photo_type: string
  taken_at: string
}

export interface DossierDetail extends Dossier {
  sites: { id: string; name: string; address: string; city: string } | null
  profiles: { full_name: string | null; phone: string | null } | null
  photos: DossierPhoto[]
}

export interface CreateDossierPayload {
  site_id: string
  plate?: string
  no_plate?: boolean
  vehicle_type?: 'va' | 'epave' | 'unknown'
  vehicle_brand?: string
  vehicle_color?: string
  location_spot?: string
  notes?: string
}

export interface UpdateDossierPayload {
  status?: DossierStatus
  plate?: string
  vehicle_brand?: string
  vehicle_color?: string
  vehicle_type?: VehicleType
  location_spot?: string
  notes?: string
  lrar_sent_at?: string
  deadline_at?: string
}
