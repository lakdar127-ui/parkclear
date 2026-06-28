import { DossierStatus } from '@/lib/api'

interface Config {
  label: string
  dot: string
  bg: string
  text: string
}

export const STATUS_CONFIG: Record<DossierStatus, Config> = {
  open:              { label: 'En attente',      dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  validated:         { label: 'Validé',           dot: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  lrar_sent:         { label: 'LRAR envoyée',     dot: 'bg-violet-400',  bg: 'bg-violet-50',  text: 'text-violet-700' },
  deadline_running:  { label: 'Délai en cours',   dot: 'bg-orange-400',  bg: 'bg-orange-50',  text: 'text-orange-700' },
  deadline_expired:  { label: 'Délai expiré',     dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700' },
  opj_contacted:     { label: 'OPJ saisi',        dot: 'bg-cyan-400',    bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  removal_scheduled: { label: 'Enlèvement prévu', dot: 'bg-teal-400',    bg: 'bg-teal-50',    text: 'text-teal-700' },
  resolved:          { label: 'Résolu',           dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  cancelled:         { label: 'Annulé',           dot: 'bg-gray-300',    bg: 'bg-gray-50',    text: 'text-gray-500' },
}

export function StatusBadge({ status }: { status: DossierStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: 'bg-gray-300', bg: 'bg-gray-50', text: 'text-gray-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
  )
}
