import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FolderOpen, AlertTriangle, CheckCircle, Clock, Plus, ArrowRight } from 'lucide-react'
import { api, Dossier } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/dossiers/StatusBadge'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: api.sites.list,
  })

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['dossiers'],
    queryFn: () => api.dossiers.list({ limit: 100 }),
  })

  // Realtime: auto-refresh quand un nouveau dossier arrive
  useEffect(() => {
    const channel = supabase
      .channel('dossiers-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dossiers' },
        () => queryClient.invalidateQueries({ queryKey: ['dossiers'] })
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  // Stats calculées côté client
  const now = new Date()
  const thisMonth = dossiers.filter((d) => {
    const created = new Date(d.created_at)
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  })

  const active = dossiers.filter((d) => !['resolved', 'cancelled'].includes(d.status))
  const actionRequired = dossiers.filter((d) =>
    ['deadline_expired', 'open'].includes(d.status)
  )
  const resolvedThisMonth = thisMonth.filter((d) => d.status === 'resolved')

  const avgDays = (() => {
    const resolved = dossiers.filter((d) => d.status === 'resolved')
    if (resolved.length === 0) return null
    const total = resolved.reduce((acc, d) => {
      return acc + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime())
    }, 0)
    return Math.round(total / resolved.length / (1000 * 60 * 60 * 24))
  })()

  const stats = [
    {
      label: 'Dossiers actifs',
      value: isLoading ? '–' : String(active.length),
      icon: FolderOpen,
      color: 'text-blue-600 bg-blue-50',
      href: '/dossiers',
    },
    {
      label: 'Action requise',
      value: isLoading ? '–' : String(actionRequired.length),
      icon: AlertTriangle,
      color: actionRequired.length > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50',
      href: '/dossiers?status=deadline_expired',
    },
    {
      label: 'Résolus ce mois',
      value: isLoading ? '–' : String(resolvedThisMonth.length),
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50',
      href: '/dossiers?status=resolved',
    },
    {
      label: 'Délai moyen',
      value: isLoading ? '–' : avgDays !== null ? `${avgDays}j` : 'N/A',
      icon: Clock,
      color: 'text-purple-600 bg-purple-50',
      href: '/dossiers',
    },
  ]

  const recentDossiers = [...dossiers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {profile?.full_name?.split(' ')[0] ?? 'là'} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {sites.length > 0
              ? `${sites.length} parking${sites.length > 1 ? 's' : ''} · ${active.length} dossier${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}`
              : 'Bienvenue sur ParkClear.'}
          </p>
        </div>
        <Link to="/dossiers" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          Nouveau dossier
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.href} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Urgent alert */}
      {actionRequired.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {actionRequired.length} dossier{actionRequired.length > 1 ? 's' : ''} nécessite{actionRequired.length > 1 ? 'nt' : ''} une action
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Délai expiré ou en attente de validation</p>
          </div>
          <Link to="/dossiers?status=deadline_expired" className="text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1">
            Voir <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Dossiers récents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Dossiers récents</h2>
          <Link to="/dossiers" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="card p-8 flex justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : recentDossiers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="card divide-y divide-gray-50">
            {recentDossiers.map((d) => (
              <DossierRow key={d.id} dossier={d} />
            ))}
          </div>
        )}
      </div>

      {/* Parkings */}
      {sites.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Vos parkings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <Link key={site.id} to={`/dossiers?site_id=${site.id}`} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-sm">{site.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    site.type === 'open' ? 'bg-green-100 text-green-700' :
                    site.type === 'closed' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {site.type === 'open' ? 'Ouvert' : site.type === 'closed' ? 'Fermé' : 'Mixte'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{site.address}, {site.city}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DossierRow({ dossier }: { dossier: Dossier }) {
  return (
    <Link
      to={`/dossiers/${dossier.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <span className="text-xl">{dossier.vehicle_type === 'epave' ? '🔧' : '🚗'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900">
            {dossier.plate ?? 'Sans plaque'}
          </span>
          <StatusBadge status={dossier.status} />
        </div>
        <p className="text-xs text-gray-400 truncate">
          {dossier.sites?.name ?? '—'}
          {dossier.location_spot ? ` · ${dossier.location_spot}` : ''}
        </p>
      </div>
      <span className="text-xs text-gray-400 shrink-0">
        {formatDistanceToNow(new Date(dossier.created_at), { addSuffix: true, locale: fr })}
      </span>
      <ArrowRight size={14} className="text-gray-300" />
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FolderOpen size={32} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun dossier pour l'instant</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
        Invitez un agent terrain pour signaler le premier véhicule abandonné via l'app mobile.
      </p>
      <div className="flex gap-3 justify-center">
        <Link to="/agents" className="btn-primary text-sm">Inviter un agent</Link>
      </div>
    </div>
  )
}
