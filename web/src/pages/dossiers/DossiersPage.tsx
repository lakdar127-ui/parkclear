import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, ArrowRight, FolderOpen, Download, Plus, X } from 'lucide-react'
import { api, Dossier, DossierStatus, CreateDossierPayload } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { StatusBadge, STATUS_CONFIG } from '@/components/dossiers/StatusBadge'

// ── New dossier form ─────────────────────────────────────────
const newDossierSchema = z.object({
  site_id: z.string().uuid('Sélectionnez un parking'),
  plate: z.string().max(20).optional(),
  no_plate: z.boolean().optional().default(false),
  vehicle_type: z.enum(['va', 'epave', 'unknown']).default('unknown'),
  vehicle_brand: z.string().max(50).optional(),
  vehicle_color: z.string().max(30).optional(),
  location_spot: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
})
type NewDossierForm = z.infer<typeof newDossierSchema>

function NewDossierModal({ onClose, sites }: { onClose: () => void; sites: any[] }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateDossierPayload) => api.dossiers.create(data),
    onSuccess: (dossier) => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] })
      navigate(`/dossiers/${dossier.id}`)
    },
  })

  const { register, handleSubmit, formState: { errors }, watch } = useForm<NewDossierForm>({
    resolver: zodResolver(newDossierSchema),
    defaultValues: { vehicle_type: 'unknown', no_plate: false },
  })

  const noPlate = watch('no_plate')

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate({
      site_id: values.site_id,
      plate: noPlate ? undefined : values.plate || undefined,
      no_plate: values.no_plate,
      vehicle_type: values.vehicle_type,
      vehicle_brand: values.vehicle_brand || undefined,
      vehicle_color: values.vehicle_color || undefined,
      location_spot: values.location_spot || undefined,
      notes: values.notes || undefined,
    })
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nouveau dossier</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {/* Site */}
          <div>
            <label className="label">Parking *</label>
            <select {...register('site_id')} className="input">
              <option value="">Sélectionner un parking…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.site_id && <p className="error-text">{errors.site_id.message}</p>}
          </div>

          {/* Plate */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Plaque d'immatriculation</label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" {...register('no_plate')} className="rounded" />
                Illisible / absente
              </label>
            </div>
            <input
              {...register('plate')}
              className="input"
              placeholder="AB-123-CD"
              disabled={noPlate}
            />
          </div>

          {/* Vehicle type */}
          <div>
            <label className="label">Type de véhicule</label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: 'va', label: 'Véhicule Abandonné', icon: '🚗' },
                { value: 'epave', label: 'Épave', icon: '🔧' },
                { value: 'unknown', label: 'Inconnu', icon: '❓' },
              ] as const).map((opt) => (
                <label key={opt.value} className={`
                  flex flex-col items-center p-3 border rounded-lg cursor-pointer text-center transition-colors
                  ${watch('vehicle_type') === opt.value ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
                `}>
                  <input type="radio" value={opt.value} {...register('vehicle_type')} className="sr-only" />
                  <span className="text-xl mb-1">{opt.icon}</span>
                  <span className="text-xs font-medium text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Marque</label>
              <input {...register('vehicle_brand')} className="input" placeholder="Renault, Peugeot…" />
            </div>
            <div>
              <label className="label">Couleur</label>
              <input {...register('vehicle_color')} className="input" placeholder="Blanc, Noir…" />
            </div>
            <div>
              <label className="label">Numéro de place</label>
              <input {...register('location_spot')} className="input" placeholder="B-42" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              {...register('notes')}
              className="input resize-none"
              rows={2}
              placeholder="Observations complémentaires…"
            />
          </div>

          {createMutation.isError && (
            <p className="error-text text-sm">{(createMutation.error as Error).message}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
              {createMutation.isPending ? 'Création…' : 'Créer le dossier →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

async function downloadCSV(url: string) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } })
  if (!res.ok) return
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `parkclear-dossiers-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

const ALL_STATUSES: DossierStatus[] = [
  'open', 'validated', 'lrar_sent', 'deadline_running',
  'deadline_expired', 'opj_contacted', 'removal_scheduled', 'resolved', 'cancelled',
]

export default function DossiersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [showNewModal, setShowNewModal] = useState(false)

  const statusFilter = (searchParams.get('status') as DossierStatus | null) ?? ''
  const siteFilter = searchParams.get('site_id') ?? ''
  const [search, setSearch] = useState('')

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: api.sites.list,
  })

  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['dossiers', { status: statusFilter, site_id: siteFilter }],
    queryFn: () => api.dossiers.list({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(siteFilter   ? { site_id: siteFilter } : {}),
      limit: 200,
    }),
  })

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('dossiers-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dossiers' },
        () => queryClient.invalidateQueries({ queryKey: ['dossiers'] })
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  const filtered = dossiers.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.plate?.toLowerCase().includes(q) ||
      d.sites?.name?.toLowerCase().includes(q) ||
      d.location_spot?.toLowerCase().includes(q) ||
      d.vehicle_brand?.toLowerCase().includes(q)
    )
  })

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? '…' : `${filtered.length} dossier${filtered.length > 1 ? 's' : ''}`}
            {statusFilter ? ` · ${STATUS_CONFIG[statusFilter as DossierStatus]?.label}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(api.exports.dossiersUrl({
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(siteFilter   ? { site_id: siteFilter }  : {}),
            }))}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Exporter les dossiers filtrés en CSV"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={15} />
            Nouveau dossier
          </button>
        </div>
      </div>

      {showNewModal && (
        <NewDossierModal onClose={() => setShowNewModal(false)} sites={sites} />
      )}

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Plaque, parking, place…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setFilter('status', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {/* Site filter */}
        <select
          value={siteFilter}
          onChange={(e) => setFilter('site_id', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">Tous les parkings</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {(statusFilter || siteFilter || search) && (
          <button
            onClick={() => { setSearchParams({}); setSearch('') }}
            className="text-sm text-gray-500 hover:text-gray-900 px-2"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('status', '')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !statusFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous ({dossiers.length})
        </button>
        {(['open', 'deadline_expired', 'lrar_sent', 'resolved'] as DossierStatus[]).map((s) => {
          const count = dossiers.filter((d) => d.status === s).length
          return (
            <button
              key={s}
              onClick={() => setFilter('status', s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {STATUS_CONFIG[s].label} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card p-12 flex justify-center">
          <div className="animate-spin h-7 w-7 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucun dossier trouvé.</p>
          {(statusFilter || siteFilter || search) && (
            <button
              onClick={() => { setSearchParams({}); setSearch('') }}
              className="mt-3 text-sm text-primary-600 hover:underline"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <div className="w-8" />
            <div>Véhicule</div>
            <div>Parking · Place</div>
            <div>Statut</div>
            <div>Date</div>
            <div />
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.map((d) => (
              <DossierTableRow key={d.id} dossier={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DossierTableRow({ dossier }: { dossier: Dossier }) {
  const isUrgent = ['deadline_expired'].includes(dossier.status)

  return (
    <Link
      to={`/dossiers/${dossier.id}`}
      className={`grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-3 items-center px-4 py-3.5 hover:bg-gray-50 transition-colors ${
        isUrgent ? 'bg-red-50/40' : ''
      }`}
    >
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-base">
        {dossier.vehicle_type === 'epave' ? '🔧' : '🚗'}
      </div>

      <div className="min-w-0">
        <div className="font-semibold text-sm text-gray-900">
          {dossier.plate ?? <span className="text-gray-400 font-normal italic">Sans plaque</span>}
        </div>
        <div className="text-xs text-gray-400">
          {dossier.vehicle_type === 'va' ? 'VA' : dossier.vehicle_type === 'epave' ? 'Épave' : '?'}
          {dossier.vehicle_brand ? ` · ${dossier.vehicle_brand}` : ''}
          {dossier.vehicle_color ? ` · ${dossier.vehicle_color}` : ''}
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-sm text-gray-700 truncate">{dossier.sites?.name ?? '—'}</div>
        <div className="text-xs text-gray-400">{dossier.location_spot ?? 'Place non renseignée'}</div>
      </div>

      <div>
        <StatusBadge status={dossier.status} />
        {dossier.deadline_at && ['deadline_running', 'deadline_expired'].includes(dossier.status) && (
          <div className={`text-xs mt-1 ${
            dossier.status === 'deadline_expired' ? 'text-red-600 font-medium' : 'text-orange-600'
          }`}>
            {dossier.status === 'deadline_expired' ? '⚠ Expiré' : ''}
            {dossier.status === 'deadline_running'
              ? `Expire ${formatDistanceToNow(new Date(dossier.deadline_at), { addSuffix: true, locale: fr })}`
              : ''}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 text-right whitespace-nowrap">
        <div>{format(new Date(dossier.created_at), 'd MMM', { locale: fr })}</div>
        <div className="text-gray-300">{formatDistanceToNow(new Date(dossier.created_at), { addSuffix: true, locale: fr })}</div>
      </div>

      <ArrowRight size={14} className="text-gray-300" />
    </Link>
  )
}
