import { DossierStatus } from '@/lib/api'

interface Config {
  label: string
  color: string
}

export const STATUS_CONFIG: Record<DossierStatus, Config> = {
  open:              { label: 'En attente',      color: 'bg-yellow-100 text-yellow-800' },
  validated:         { label: 'Validé',           color: 'bg-blue-100 text-blue-800' },
  lrar_sent:         { label: 'LRAR envoyée',     color: 'bg-violet-100 text-violet-800' },
  deadline_running:  { label: 'Délai en cours',   color: 'bg-orange-100 text-orange-800' },
  deadline_expired:  { label: 'Délai expiré',     color: 'bg-red-100 text-red-800' },
  opj_contacted:     { label: 'OPJ saisi',        color: 'bg-cyan-100 text-cyan-800' },
  removal_scheduled: { label: 'Enlèvement prévu', color: 'bg-teal-100 text-teal-800' },
  resolved:          { label: 'Résolu',           color: 'bg-green-100 text-green-800' },
  cancelled:         { label: 'Annulé',           color: 'bg-gray-100 text-gray-500' },
}

export function StatusBadge({ status }: { status: DossierStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}
