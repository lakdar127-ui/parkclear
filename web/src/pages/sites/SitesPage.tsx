import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, Plus, Trash2, X, Building2 } from 'lucide-react'
import { api, Site, CreateSitePayload } from '@/lib/api'

const siteSchema = z.object({
  name: z.string().min(2, 'Requis'),
  address: z.string().min(5, 'Requis'),
  city: z.string().min(2, 'Requis'),
  postal_code: z.string().regex(/^\d{5}$/, '5 chiffres requis'),
  type: z.enum(['open', 'closed', 'mixed']),
  total_places: z.coerce.number().int().positive().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
})

type SiteForm = z.infer<typeof siteSchema>

const TYPE_LABELS: Record<string, string> = {
  open: 'Ouvert',
  closed: 'Fermé',
  mixed: 'Mixte',
}

const TYPE_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  closed: 'bg-amber-100 text-amber-700',
  mixed: 'bg-blue-100 text-blue-700',
}

export default function SitesPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: api.sites.list,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateSitePayload) => api.sites.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setShowModal(false)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.sites.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setDeleteConfirm(null)
    },
  })

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<SiteForm>({
    resolver: zodResolver(siteSchema),
    defaultValues: { type: 'open' },
  })

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate({
      name: values.name,
      address: values.address,
      city: values.city,
      postal_code: values.postal_code,
      type: values.type,
      total_places: values.total_places ? Number(values.total_places) : undefined,
      notes: values.notes || undefined,
    })
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parkings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? '…' : `${sites.length} parking${sites.length > 1 ? 's' : ''} configuré${sites.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Ajouter un parking
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="card p-12 flex justify-center">
          <div className="animate-spin h-7 w-7 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : sites.length === 0 ? (
        <EmptyState onAdd={() => setShowModal(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onDelete={() => setDeleteConfirm(site.id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Nouveau parking</h2>
              <button onClick={() => { setShowModal(false); reset() }} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Nom du parking *</label>
                <input {...register('name')} className="input" placeholder="Parking Centre Commercial A" />
                {errors.name && <p className="error-text">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Adresse *</label>
                  <input {...register('address')} className="input" placeholder="12 avenue du Commerce" />
                  {errors.address && <p className="error-text">{errors.address.message}</p>}
                </div>
                <div>
                  <label className="label">Ville *</label>
                  <input {...register('city')} className="input" placeholder="Paris" />
                  {errors.city && <p className="error-text">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="label">Code postal *</label>
                  <input {...register('postal_code')} className="input" placeholder="75001" />
                  {errors.postal_code && <p className="error-text">{errors.postal_code.message}</p>}
                </div>
              </div>

              <div>
                <label className="label">Type d'accès *</label>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {(['open', 'closed', 'mixed'] as const).map((t) => (
                    <label key={t} className={`
                      flex flex-col items-center p-3 border rounded-lg cursor-pointer text-center transition-colors
                      ${watch('type') === t ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
                    `}>
                      <input type="radio" value={t} {...register('type')} className="sr-only" />
                      <span className="text-lg mb-1">{t === 'open' ? '🌐' : t === 'closed' ? '🔒' : '🔄'}</span>
                      <span className="text-xs font-medium text-gray-900">{TYPE_LABELS[t]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre de places</label>
                  <input {...register('total_places')} type="number" className="input" placeholder="250" />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input {...register('notes')} className="input" placeholder="Infos complémentaires" />
                </div>
              </div>

              {createMutation.isError && (
                <p className="error-text text-sm">{(createMutation.error as Error).message}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); reset() }}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createMutation.isPending ? 'Enregistrement…' : 'Créer le parking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Supprimer ce parking ?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Cette action est irréversible. Les dossiers associés seront également supprimés.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="btn-danger flex-1"
              >
                {deleteMutation.isPending ? '…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SiteCard({ site, onDelete }: { site: Site; onDelete: () => void }) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{site.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${TYPE_COLORS[site.type]}`}>
              {TYPE_LABELS[site.type]}
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-1.5 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{site.address}, {site.city} {site.postal_code}</span>
        </div>
        {site.total_places && (
          <div className="flex items-center gap-2">
            <span className="text-xs">🅿</span>
            <span>{site.total_places} places</span>
          </div>
        )}
        {site.notes && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{site.notes}</p>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <MapPin size={32} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun parking configuré</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
        Ajoutez vos parkings pour pouvoir créer des dossiers de véhicules abandonnés.
      </p>
      <button onClick={onAdd} className="btn-primary">
        Ajouter un parking
      </button>
    </div>
  )
}
