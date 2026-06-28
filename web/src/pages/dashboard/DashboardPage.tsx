import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FolderOpen, AlertTriangle, CheckCircle, Clock,
  Plus, ArrowRight, TrendingUp, Building2,
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
    const channel = supabase
      .channel('dossiers-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dossiers' },
        () => queryClient.invalidateQueries({ queryKey: ['dossiers'] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  const now = new Date()
  const thisMonth = dossiers.filter((d) => {
    const c = new Date(d.created_at)
    return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
  })
  const active = dossiers.filter((d) => !['resolved', 'cancelled'].includes(d.status))
  const actionRequired = dossiers.filter((d) => ['deadline_expired', 'open'].includes(d.status))
  const resolvedThisMonth = thisMonth.filter((d) => d.status === 'resolved')

  const avgDays = (() => {
    const resolved = dossiers.filter((d) => d.status === 'resolved')
    if (!resolved.length) return null
    const total = resolved.reduce((acc, d) =>
      acc + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()), 0)
    return Math.round(total / resolved.length / 86400000)
  })()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'là'

  const stats = [
    {
      label: 'Dossiers actifs',
      value: isLoading ? '–' : active.length,
      sub: `sur ${dossiers.length} total`,
      icon: FolderOpen,
      href: '/dossiers',
      accent: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Action requise',
      value: isLoading ? '–' : actionRequired.length,
      sub: actionRequired.length > 0 ? 'à traiter maintenant' : 'rien en attente',
      icon: AlertTriangle,
      href: '/dossiers?status=open',
      accent: actionRequired.length > 0 ? 'from-amber-500 to-orange-500' : 'from-gray-400 to-gray-500',
      bg: actionRequired.length > 0 ? 'bg-amber-50' : 'bg-gray-50',
      iconColor: actionRequired.length > 0 ? 'text-amber-600' : 'text-gray-400',
      urgent: actionRequired.length > 0,
    },
    {
      label: 'Résolus ce mois',
      value: isLoading ? '–' : resolvedThisMonth.length,
      sub: 'dossiers clôturés',
      icon: CheckCircle,
      href: '/dossiers?status=resolved',
      accent: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Délai moyen',
      value: isLoading ? '–' : avgDays !== null ? `${avgDays}j` : 'N/A',
      sub: 'de résolution',
      icon: Clock,
      href: '/dossiers',
      accent: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ]

  const recentDossiers = [...dossiers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  return (
    <div className="space-y-7 animate-slide-up">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bonjour, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {sites.length > 0
              ? `${sites.length} parking${sites.length > 1 ? 's' : ''} · ${active.length} dossier${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}`
              : 'Bienvenue sur ParkClear.'}
          </p>
        </div>
        <Link to="/dossiers" className="btn-primary gap-1.5">
          <Plus size={15} />
          Nouveau dossier
        </Link>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.href}
            className={`card p-5 hover:shadow-card-md transition-all duration-200 group ${s.urgent ? 'ring-2 ring-amber-200' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon size={18} className={s.iconColor} />
              </div>
              <ArrowRight size={14} className="text-gray-200 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all mt-1" />
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{s.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
            <p className="text-[11px] text-gray-400 mt-1">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Alert banner ─────────────────────────────────────── */}
      {actionRequired.length > 0 && (
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="p-2 bg-amber-100 rounded-xl shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {actionRequired.length} dossier{actionRequired.length > 1 ? 's' : ''} nécessite{actionRequired.length > 1 ? 'nt' : ''} votre attention
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Délai expiré ou en attente de validation</p>
          </div>
          <Link to="/dossiers?status=open" className="btn text-amber-700 bg-amber-100 hover:bg-amber-200 text-xs px-3 py-1.5 shrink-0">
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── Main grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent dossiers */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Dossiers récents</h2>
            <Link to="/dossiers" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="card p-10 flex justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : recentDossiers.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="card overflow-hidden">
              {recentDossiers.map((d, i) => (
                <DossierRow key={d.id} dossier={d} isLast={i === recentDossiers.length - 1} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: sites + quick stats */}
        <div className="space-y-4">

          {/* Parkings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Parkings</h2>
              <Link to="/sites" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                Gérer <ArrowRight size={12} />
              </Link>
            </div>
            {sites.length === 0 ? (
              <Link to="/sites" className="card p-4 flex items-center gap-3 hover:shadow-card-md transition-all text-gray-500 hover:text-gray-700">
                <Building2 size={16} className="text-gray-300" />
                <span className="text-xs">Ajouter un parking</span>
              </Link>
            ) : (
              <div className="space-y-2">
                {sites.slice(0, 4).map((site) => {
                  const siteDossiers = dossiers.filter((d) => d.site_id === site.id && !['resolved', 'cancelled'].includes(d.status))
                  return (
                    <Link
                      key={site.id}
                      to={`/dossiers?site_id=${site.id}`}
                      className="card p-3.5 flex items-center gap-3 hover:shadow-card-md transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{site.name}</p>
                        <p className="text-[11px] text-gray-400">{site.city}</p>
                      </div>
                      {siteDossiers.length > 0 && (
                        <span className="text-[11px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                          {siteDossiers.length}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Activity summary */}
          {dossiers.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-primary-500" />
                <h3 className="text-xs font-semibold text-gray-900">Répartition par statut</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'En cours', count: dossiers.filter(d => ['open','validated','lrar_sent','deadline_running'].includes(d.status)).length, color: 'bg-blue-400' },
                  { label: 'Urgent', count: dossiers.filter(d => ['deadline_expired','opj_contacted'].includes(d.status)).length, color: 'bg-amber-400' },
                  { label: 'Résolu', count: dossiers.filter(d => d.status === 'resolved').length, color: 'bg-emerald-400' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                    <span className="text-[11px] text-gray-500 flex-1">{item.label}</span>
                    <span className="text-[11px] font-semibold text-gray-700">{item.count}</span>
                    <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${dossiers.length ? (item.count / dossiers.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DossierRow({ dossier, isLast }: { dossier: Dossier; isLast: boolean }) {
  return (
    <Link
      to={`/dossiers/${dossier.id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-gray-50' : ''}`}
    >
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-sm">
        {dossier.vehicle_type === 'epave' ? '🔧' : '🚗'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {dossier.plate ?? 'Sans plaque'}
          </span>
          <StatusBadge status={dossier.status} />
        </div>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">
          {dossier.sites?.name ?? '—'}
          {dossier.location_spot ? ` · ${dossier.location_spot}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[11px] text-gray-400">
          {formatDistanceToNow(new Date(dossier.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <FolderOpen size={24} className="text-gray-300" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Aucun dossier</h3>
      <p className="text-xs text-gray-400 mb-4">Invitez un agent ou créez votre premier dossier.</p>
      <Link to="/agents" className="btn-primary text-xs px-4 py-2">Inviter un agent</Link>
    </div>
  )
}
