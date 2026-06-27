import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft, CheckCircle, Send, Phone, Truck, XCircle,
  MapPin, User, Calendar, Image as ImageIcon, AlertTriangle,
  Download, FileText,
} from 'lucide-react'
import { api, DossierStatus, UpdateDossierPayload } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/dossiers/StatusBadge'

const API_URL = import.meta.env.VITE_API_URL as string

async function downloadDocument(path: string, filename: string) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })
  if (!res.ok) throw new Error('Téléchargement échoué')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const TIMELINE: { status: DossierStatus; label: string; desc: string }[] = [
  { status: 'open',              label: 'Signalement créé',      desc: 'Photo + plaque enregistrées' },
  { status: 'validated',         label: 'Dossier validé',        desc: 'Procédure légale déclenchée' },
  { status: 'lrar_sent',         label: 'LRAR envoyée',          desc: 'Mise en demeure 10 jours' },
  { status: 'deadline_running',  label: 'Délai en cours',        desc: 'Attente réponse propriétaire' },
  { status: 'deadline_expired',  label: 'Délai expiré',          desc: "Propriétaire n'a pas répondu" },
  { status: 'opj_contacted',     label: 'OPJ contacté',          desc: 'Officier de police judiciaire saisi' },
  { status: 'removal_scheduled', label: 'Enlèvement planifié',   desc: 'Fourrière mandatée' },
  { status: 'resolved',          label: 'Dossier clôturé',       desc: 'Véhicule enlevé' },
]

const STATUS_ORDER = TIMELINE.map((t) => t.status)

interface Action {
  label: string
  icon: React.ElementType
  targetStatus: DossierStatus
  variant: 'primary' | 'danger' | 'secondary'
  confirm?: string
  lrarFlow?: boolean
}

const ACTIONS: Partial<Record<DossierStatus, Action[]>> = {
  open: [
    { label: 'Valider le dossier', icon: CheckCircle, targetStatus: 'validated', variant: 'primary',
      confirm: 'Confirmer la validation ? Cela déclenche la procédure légale.' },
    { label: 'Annuler', icon: XCircle, targetStatus: 'cancelled', variant: 'danger',
      confirm: 'Annuler définitivement ce dossier ?' },
  ],
  validated: [
    { label: 'Envoyer LRAR', icon: Send, targetStatus: 'lrar_sent', variant: 'primary', lrarFlow: true },
    { label: 'Annuler', icon: XCircle, targetStatus: 'cancelled', variant: 'danger',
      confirm: 'Annuler ce dossier ?' },
  ],
  lrar_sent: [
    { label: 'Délai en cours', icon: Calendar, targetStatus: 'deadline_running', variant: 'secondary',
      confirm: 'Marquer le délai de 10 jours comme démarré ?' },
  ],
  deadline_running: [
    { label: 'Délai expiré', icon: AlertTriangle, targetStatus: 'deadline_expired', variant: 'secondary',
      confirm: 'Confirmer que le délai de 10 jours est expiré ?' },
  ],
  deadline_expired: [
    { label: 'Contacter OPJ', icon: Phone, targetStatus: 'opj_contacted', variant: 'primary',
      confirm: 'Confirmer que vous avez contacté un OPJ ?' },
  ],
  opj_contacted: [
    { label: 'Planifier enlèvement', icon: Truck, targetStatus: 'removal_scheduled', variant: 'primary',
      confirm: 'Confirmer que la fourrière a été mandatée ?' },
  ],
  removal_scheduled: [
    { label: 'Clôturer le dossier', icon: CheckCircle, targetStatus: 'resolved', variant: 'primary',
      confirm: 'Confirmer que le véhicule a été enlevé ?' },
  ],
}

export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [lrarDate, setLrarDate] = useState('')
  const [showLrarModal, setShowLrarModal] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (type: 'lrar' | 'opj') => {
    setDownloading(type)
    const plate = dossier?.plate?.replace(/[^A-Z0-9]/g, '') ?? 'SANSPLAQUE'
    const ref = id?.slice(0, 8).toUpperCase() ?? ''
    try {
      await downloadDocument(
        `/api/documents/${type}/${id}`,
        type === 'lrar' ? `LRAR_${plate}_${ref}.pdf` : `DOSSIER_OPJ_${plate}_${ref}.pdf`
      )
    } catch (err: any) {
      window.alert(err.message)
    } finally {
      setDownloading(null)
    }
  }

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['dossier', id],
    queryFn: () => api.dossiers.get(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateDossierPayload) => api.dossiers.update(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossier', id] })
      queryClient.invalidateQueries({ queryKey: ['dossiers'] })
    },
  })

  // Fetch signed URLs for photos
  useEffect(() => {
    if (!dossier?.photos?.length) return
    const load = async () => {
      const urls: Record<string, string> = {}
      for (const photo of dossier.photos) {
        const { data } = await supabase.storage
          .from('photos')
          .createSignedUrl(photo.storage_path, 3600)
        if (data) urls[photo.id] = data.signedUrl
      }
      setPhotoUrls(urls)
    }
    load()
  }, [dossier?.photos])

  const handleAction = async (action: Action) => {
    if (action.lrarFlow) {
      setShowLrarModal(true)
      return
    }
    if (action.confirm && !window.confirm(action.confirm)) return

    const payload: UpdateDossierPayload = { status: action.targetStatus }
    updateMutation.mutate(payload)
  }

  const handleLrarSubmit = () => {
    if (!lrarDate) return
    const deadline = new Date(lrarDate)
    deadline.setDate(deadline.getDate() + 10)

    updateMutation.mutate({
      status: 'lrar_sent',
      lrar_sent_at: new Date(lrarDate).toISOString(),
      deadline_at: deadline.toISOString(),
    })
    setShowLrarModal(false)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!dossier) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Dossier introuvable.</p>
        <Link to="/dossiers" className="text-primary-600 text-sm mt-2 inline-block hover:underline">
          ← Retour aux dossiers
        </Link>
      </div>
    )
  }

  const currentStep = STATUS_ORDER.indexOf(dossier.status)
  const actions = ACTIONS[dossier.status] ?? []
  const daysOpen = Math.floor(
    (Date.now() - new Date(dossier.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <Link to="/dossiers" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft size={15} /> Dossiers
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {dossier.plate ?? 'Sans plaque'}
              </h1>
              <StatusBadge status={dossier.status} />
            </div>
            <p className="text-sm text-gray-500">
              Dossier #{id?.slice(0, 8).toUpperCase()} · Créé il y a {daysOpen === 0 ? 'aujourd\'hui' : `${daysOpen} jours`}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Status actions */}
            {actions.map((action) => (
              <button
                key={action.targetStatus}
                onClick={() => handleAction(action)}
                disabled={updateMutation.isPending}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  action.variant === 'primary' ? 'btn-primary' :
                  action.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                  'btn-secondary'
                }`}
              >
                <action.icon size={15} />
                {action.label}
              </button>
            ))}

            {/* PDF downloads — visible once validated */}
            {!['open', 'cancelled'].includes(dossier.status) && (
              <>
                <button
                  onClick={() => handleDownload('lrar')}
                  disabled={downloading === 'lrar'}
                  className="btn-secondary flex items-center gap-2 text-sm"
                  title="Télécharger la lettre de mise en demeure"
                >
                  <FileText size={15} />
                  {downloading === 'lrar' ? '…' : 'LRAR PDF'}
                </button>
                {['opj_contacted', 'removal_scheduled', 'resolved'].includes(dossier.status) && (
                  <button
                    onClick={() => handleDownload('opj')}
                    disabled={downloading === 'opj'}
                    className="btn-secondary flex items-center gap-2 text-sm"
                    title="Télécharger le dossier OPJ"
                  >
                    <Download size={15} />
                    {downloading === 'opj' ? '…' : 'Dossier OPJ'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Vehicle info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Véhicule</h2>
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="Plaque" value={dossier.no_plate ? 'Illisible / absente' : (dossier.plate ?? '—')} />
              <InfoItem label="Type" value={
                dossier.vehicle_type === 'va' ? 'Véhicule Abandonné' :
                dossier.vehicle_type === 'epave' ? 'Épave' : 'Inconnu'
              } />
              <InfoItem label="Marque" value={dossier.vehicle_brand ?? '—'} />
              <InfoItem label="Couleur" value={dossier.vehicle_color ?? '—'} />
            </div>
          </div>

          {/* Location */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <MapPin size={14} /> Localisation
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="Parking" value={dossier.sites?.name ?? '—'} />
              <InfoItem label="Adresse" value={dossier.sites ? `${dossier.sites.address}, ${dossier.sites.city}` : '—'} />
              <InfoItem label="Numéro de place" value={dossier.location_spot ?? 'Non renseigné'} />
            </div>
          </div>

          {/* Photos */}
          {dossier.photos && dossier.photos.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ImageIcon size={14} /> Photos ({dossier.photos.length})
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {dossier.photos.map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative group">
                    {photoUrls[photo.id] ? (
                      <a href={photoUrls[photo.id]} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photoUrls[photo.id]}
                          alt={photo.photo_type}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </a>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      {photo.photo_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {dossier.notes && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{dossier.notes}</p>
            </div>
          )}

          {/* Procedure dates */}
          {(dossier.lrar_sent_at || dossier.deadline_at) && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Procédure</h2>
              <div className="grid grid-cols-2 gap-3">
                {dossier.lrar_sent_at && (
                  <InfoItem
                    label="LRAR envoyée le"
                    value={format(new Date(dossier.lrar_sent_at), 'dd MMMM yyyy', { locale: fr })}
                  />
                )}
                {dossier.deadline_at && (
                  <InfoItem
                    label="Délai expire le"
                    value={format(new Date(dossier.deadline_at), 'dd MMMM yyyy', { locale: fr })}
                    alert={new Date(dossier.deadline_at) < new Date()}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column — timeline + meta */}
        <div className="space-y-5">
          {/* Timeline */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Procédure légale</h2>
            <div className="space-y-0">
              {TIMELINE.map((step, i) => {
                const done = i < currentStep
                const active = i === currentStep
                const isLast = i === TIMELINE.length - 1

                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        done   ? 'border-primary-600 bg-primary-600' :
                        active ? 'border-primary-600 bg-white' :
                                 'border-gray-200 bg-white'
                      }`}>
                        {done && <CheckCircle size={12} className="text-white" />}
                        {active && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 min-h-5 ${done ? 'bg-primary-200' : 'bg-gray-100'}`} />
                      )}
                    </div>
                    <div className={`pb-4 ${isLast ? '' : ''}`}>
                      <p className={`text-sm font-medium leading-tight ${
                        active ? 'text-primary-700' :
                        done   ? 'text-gray-700' :
                                 'text-gray-300'
                      }`}>
                        {step.label}
                      </p>
                      {(active || done) && (
                        <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Meta */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <User size={14} /> Informations
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Agent</span>
                <span className="text-gray-900">{dossier.profiles?.full_name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Créé le</span>
                <span className="text-gray-900">
                  {format(new Date(dossier.created_at), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mis à jour</span>
                <span className="text-gray-900">
                  {formatDistanceToNow(new Date(dossier.updated_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="text-gray-400 font-mono text-xs">{id?.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LRAR Modal */}
      {showLrarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Envoyer la LRAR</h3>
            <p className="text-sm text-gray-500 mb-4">
              Indiquez la date d'envoi de la lettre recommandée. Le délai de 10 jours sera calculé automatiquement.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'envoi LRAR</label>
              <input
                type="date"
                value={lrarDate}
                onChange={(e) => setLrarDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {lrarDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Délai expire le : <strong>
                    {format(
                      new Date(new Date(lrarDate).setDate(new Date(lrarDate).getDate() + 10)),
                      'dd MMMM yyyy', { locale: fr }
                    )}
                  </strong>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLrarModal(false)}
                className="flex-1 btn-secondary text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleLrarSubmit}
                disabled={!lrarDate || updateMutation.isPending}
                className="flex-1 btn-primary text-sm disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
