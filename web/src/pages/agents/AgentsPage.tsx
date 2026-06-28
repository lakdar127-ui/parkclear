import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Users, UserPlus, X, Mail, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface AgentProfile {
  id: string
  full_name: string | null
  role: string
  created_at: string
}

const inviteSchema = z.object({
  email: z.string().email('Email invalide'),
})
type InviteForm = z.infer<typeof inviteSchema>

export default function AgentsPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [invited, setInvited] = useState(false)

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async (): Promise<AgentProfile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .eq('role', 'agent')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as AgentProfile[]
    },
  })

  const inviteMutation = useMutation({
    mutationFn: ({ email }: InviteForm) => api.agents.invite(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setInvited(true)
      reset()
      setTimeout(() => {
        setShowModal(false)
        setInvited(false)
      }, 2000)
    },
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  })

  const onSubmit = handleSubmit((values) => {
    inviteMutation.mutate(values)
  })

  const canInvite = profile?.role === 'manager' || profile?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Agents terrain</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {isLoading ? '…' : `${agents.length} agent${agents.length > 1 ? 's' : ''} actif${agents.length > 1 ? 's' : ''}`}
          </p>
        </div>
        {canInvite && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} />
            Inviter un agent
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl p-4 text-sm"
        style={{ background: 'rgba(45,126,248,0.08)', border: '1px solid rgba(45,126,248,0.20)', color: 'var(--text-secondary)' }}>
        <span className="shrink-0" style={{ color: 'var(--electric-blue)' }}>ℹ</span>
        <span><strong style={{ color: 'var(--text-primary)' }}>Comment ça marche ?</strong> Les agents terrain utilisent l'application mobile ParkClear pour signaler les véhicules abandonnés. Invitez-les par email — ils reçoivent un lien pour créer leur compte.</span>
      </div>

      {/* Agents list */}
      {isLoading ? (
        <div className="card p-12 flex justify-center">
          <div className="animate-spin h-7 w-7 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--electric-blue)', borderTopColor: 'transparent' }} />
        </div>
      ) : agents.length === 0 ? (
        <EmptyState onInvite={() => setShowModal(true)} canInvite={canInvite} />
      ) : (
        <div className="card divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Inviter un agent</h2>
              <button
                onClick={() => { setShowModal(false); reset(); setInvited(false) }}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {invited ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(0,200,150,0.15)' }}>
                    <CheckCircle size={28} style={{ color: 'var(--success)' }} />
                  </div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Invitation envoyée !</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>L'agent recevra un email avec un lien pour créer son compte.</p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="label">Email de l'agent *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                      <input
                        {...register('email')}
                        type="email"
                        className="input pl-9"
                        placeholder="agent@entreprise.fr"
                      />
                    </div>
                    {errors.email && <p className="error-text">{errors.email.message}</p>}
                  </div>

                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    L'agent recevra un email d'invitation. Il pourra ensuite se connecter depuis l'application mobile pour signaler des véhicules.
                  </p>

                  {inviteMutation.isError && (
                    <p className="error-text text-sm">{(inviteMutation.error as Error).message}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); reset() }}
                      className="btn-secondary flex-1"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={inviteMutation.isPending}
                      className="btn-primary flex-1"
                    >
                      {inviteMutation.isPending ? 'Envoi…' : 'Envoyer l\'invitation'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AgentRow({ agent }: { agent: AgentProfile }) {
  const initials = agent.full_name
    ? agent.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, #2D7EF8, #7B61FF)' }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{agent.full_name ?? 'Nom non renseigné'}</p>
        <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--text-muted)' }}>Agent terrain</p>
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Depuis le {new Date(agent.created_at).toLocaleDateString('fr-FR')}
      </div>
    </div>
  )
}

function EmptyState({ onInvite, canInvite }: { onInvite: () => void; canInvite: boolean }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(255,255,255,0.06)' }}>
        <Users size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Aucun agent pour l'instant</h3>
      <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
        Invitez vos agents terrain pour qu'ils puissent signaler les véhicules abandonnés depuis leur mobile.
      </p>
      {canInvite && (
        <button onClick={onInvite} className="btn-primary">
          Inviter un premier agent
        </button>
      )}
    </div>
  )
}
