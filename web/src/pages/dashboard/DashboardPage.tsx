import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FolderOpen, AlertTriangle, CheckCircle, Clock,
  Plus, ArrowRight, TrendingUp, Building2, ArrowUpRight,
  Car, Wrench, ChevronRight, MapPin,
} from 'lucide-react'
import { api, Dossier } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/dossiers/StatusBadge'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: sites = [] } = useQuery({ queryKey: ['sites'], queryFn: api.sites.list })
  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['dossiers'],
    queryFn: () => api.dossiers.list({ limit: 100 }),
  })

  useEffect(() => {
    const ch = supabase.channel('dossiers-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers' },
        () => queryClient.invalidateQueries({ queryKey: ['dossiers'] }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [queryClient])

  const now = new Date()
  const thisMonth = dossiers.filter(d => {
    const c = new Date(d.created_at)
    return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
  })
  const active = dossiers.filter(d => !['resolved', 'cancelled'].includes(d.status))
  const actionRequired = dossiers.filter(d => ['deadline_expired', 'open'].includes(d.status))
  const resolvedThisMonth = thisMonth.filter(d => d.status === 'resolved')
  const avgDays = (() => {
    const r = dossiers.filter(d => d.status === 'resolved')
    if (!r.length) return null
    const t = r.reduce((a, d) => a + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()), 0)
    return Math.round(t / r.length / 86400000)
  })()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'là'

  const stats = [
    {
      label: 'Dossiers actifs',
      value: isLoading ? '–' : active.length,
      sub: `sur ${dossiers.length} total`,
      icon: FolderOpen,
      href: '/dossiers',
      color: '#7C5CFC',
      glow: 'rgba(124,92,252,0.20)',
    },
    {
      label: 'Action requise',
      value: isLoading ? '–' : actionRequired.length,
      sub: actionRequired.length > 0 ? 'à traiter' : 'tout est ok',
      icon: AlertTriangle,
      href: '/dossiers?status=open',
      color: actionRequired.length > 0 ? '#FF4D6A' : '#4A5568',
      glow: actionRequired.length > 0 ? 'rgba(255,77,106,0.15)' : 'transparent',
      urgent: actionRequired.length > 0,
    },
    {
      label: 'Résolus ce mois',
      value: isLoading ? '–' : resolvedThisMonth.length,
      sub: 'dossiers clôturés',
      icon: CheckCircle,
      href: '/dossiers?status=resolved',
      color: '#00E5A0',
      glow: 'rgba(0,229,160,0.15)',
    },
    {
      label: 'Délai moyen',
      value: isLoading ? '–' : avgDays !== null ? `${avgDays}j` : 'N/A',
      sub: 'par dossier résolu',
      icon: Clock,
      href: '/dossiers',
      color: '#00D2FF',
      glow: 'rgba(0,210,255,0.15)',
    },
  ]

  const recent = [...dossiers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Radial glow header ──────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-0 -top-6 bg-radial-glow" />
        <div className="relative flex items-start justify-between">
          <div>
            <p style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Dashboard
            </p>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              Bonjour, {firstName} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {sites.length > 0
                ? `${sites.length} parking${sites.length > 1 ? 's' : ''} · ${active.length} dossier${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}`
                : 'Bienvenue sur ParkClear.'}
            </p>
          </div>
          <Link to="/dossiers" className="btn-primary gap-2 text-sm">
            <Plus size={15} />
            Nouveau dossier
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.href} className="kpi-card group"
            style={{ border: s.urgent ? `1px solid ${s.color}50` : undefined }}>
            {/* Top-border glow is handled by .kpi-card::before via CSS */}
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl" style={{ background: `${s.color}18` }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-60 transition-opacity mt-1"
                style={{ color: s.color }} />
            </div>
            <p className="kpi-number font-bold" style={{ color: 'var(--text-primary)', fontSize: '32px', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '6px' }}>
              {s.value}
            </p>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Alert ───────────────────────────────────────────── */}
      {actionRequired.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.25)' }}>
          <div className="pulse-dot" />
          <div style={{ flex: 1 }}>
            <p className="text-sm font-semibold" style={{ color: '#FF7A8A' }}>
              {actionRequired.length} dossier{actionRequired.length > 1 ? 's' : ''} nécessite{actionRequired.length > 1 ? 'nt' : ''} votre attention
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,77,106,0.6)' }}>En attente de validation · délai expiré</p>
          </div>
          <Link to="/dossiers?status=open" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-all"
            style={{ color: '#FF4D6A', background: 'rgba(255,77,106,0.12)', border: '1px solid rgba(255,77,106,0.25)' }}>
            Traiter <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent dossiers */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Dossiers récents</p>
            <Link to="/dossiers" className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--electric-blue)' }}>
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="card p-8 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shimmer" />
                  <div style={{ flex: 1 }}>
                    <div className="h-3 rounded-lg shimmer mb-2" style={{ width: '40%' }} />
                    <div className="h-2.5 rounded-lg shimmer" style={{ width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {recent.map((d, i) => (
                <DossierRow key={d.id} dossier={d} isLast={i === recent.length - 1} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Parkings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Parkings</p>
              <Link to="/sites" className="text-xs font-medium" style={{ color: 'var(--electric-blue)' }}>
                Gérer →
              </Link>
            </div>
            {sites.length === 0 ? (
              <Link to="/sites" className="card flex items-center gap-3 p-4 hover:border-blue-500/30 transition-all"
                style={{ color: 'var(--text-muted)' }}>
                <Building2 size={16} />
                <span className="text-xs">Ajouter un parking</span>
              </Link>
            ) : (
              <div className="space-y-2">
                {sites.slice(0, 5).map(site => {
                  const n = dossiers.filter(d => d.site_id === site.id && !['resolved','cancelled'].includes(d.status)).length
                  return (
                    <Link key={site.id} to={`/dossiers?site_id=${site.id}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(45,126,248,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(45,126,248,0.12)' }}>
                        <Building2 size={14} style={{ color: '#2D7EF8' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{site.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{site.city}</p>
                      </div>
                      {n > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: '#2D7EF8', background: 'rgba(45,126,248,0.15)' }}>
                          {n}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Répartition */}
          {dossiers.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} style={{ color: '#2D7EF8' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Répartition</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'En cours',  count: dossiers.filter(d => ['open','validated','lrar_sent','deadline_running'].includes(d.status)).length, color: '#2D7EF8' },
                  { label: 'Urgent',    count: dossiers.filter(d => ['deadline_expired','opj_contacted'].includes(d.status)).length, color: '#FFB547' },
                  { label: 'Résolu',   count: dossiers.filter(d => d.status === 'resolved').length, color: '#00C896' },
                ].map(item => {
                  const pct = dossiers.length ? Math.round((item.count / dossiers.length) * 100) : 0
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                        </div>
                        <span className="text-[11px] font-bold kpi-number" style={{ color: 'var(--text-primary)' }}>{item.count}</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: item.color, boxShadow: `0 0 8px ${item.color}60` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DossierRow({ dossier, isLast }: { dossier: Dossier; isLast: boolean }) {
  const isEpave = dossier.vehicle_type === 'epave'
  return (
    <Link to={`/dossiers/${dossier.id}`}
      className="group flex items-center gap-3 px-4 py-3 transition-all"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,92,252,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: isEpave ? 'rgba(255,181,71,0.12)' : 'rgba(124,92,252,0.12)' }}>
        {isEpave
          ? <Wrench size={15} style={{ color: '#FFB547' }} />
          : <Car size={15} style={{ color: '#A594FF' }} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="kpi-number text-sm font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            {dossier.plate ?? 'Sans plaque'}
          </span>
          <StatusBadge status={dossier.status} />
        </div>
        <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {dossier.sites?.name && <><MapPin size={10} /><span className="text-[11px] truncate">{dossier.sites.name}{dossier.location_spot ? ` · ${dossier.location_spot}` : ''}</span></>}
        </div>
      </div>
      <p className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
        {formatDistanceToNow(new Date(dossier.created_at), { addSuffix: true, locale: fr })}
      </p>
      <ChevronRight size={13} className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
        style={{ color: 'var(--text-primary)', transform: 'translateX(0)', transition: 'all 0.15s' }} />
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(255,255,255,0.06)' }}>
        <FolderOpen size={24} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Aucun dossier</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Invitez un agent ou créez votre premier dossier.</p>
      <Link to="/agents" className="btn-primary text-xs px-4 py-2">Inviter un agent</Link>
    </div>
  )
}
