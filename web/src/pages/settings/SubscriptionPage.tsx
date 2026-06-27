import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, Zap, Building2, Rocket, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

type Plan = 'trial' | 'starter' | 'pro' | 'business'

interface PlanConfig {
  id: 'starter' | 'pro' | 'business'
  name: string
  price: number
  icon: React.ElementType
  color: string
  bg: string
  border: string
  features: string[]
  limits: string
  highlight?: boolean
}

const PLANS: PlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    icon: Zap,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    limits: '5 dossiers actifs · 1 parking · 2 agents',
    features: [
      'Signalement mobile illimité',
      'Génération LRAR PDF',
      'Dashboard gestionnaire',
      'Alertes deadline par email',
      'Export CSV',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59,
    icon: Rocket,
    color: 'text-primary-600',
    bg: 'bg-primary-50',
    border: 'border-primary-300',
    limits: '20 dossiers actifs · 5 parkings · 10 agents',
    highlight: true,
    features: [
      'Tout Starter, plus :',
      'Dossier OPJ PDF',
      'Realtime dashboard',
      'Multi-parkings',
      'Statistiques avancées',
      'Support prioritaire',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 99,
    icon: Building2,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    limits: 'Dossiers illimités · Sites illimités · Agents illimités',
    features: [
      'Tout Pro, plus :',
      'Agents illimités',
      'Parkings illimités',
      'API B2B disponible',
      'SLA 99.9%',
      'Account manager dédié',
    ],
  },
]

const PLAN_LABELS: Record<Plan, string> = {
  trial: 'Essai gratuit',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
}

export default function SubscriptionPage() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)

  const success  = searchParams.get('success') === '1'
  const cancelled = searchParams.get('cancelled') === '1'

  const { data: org } = useQuery({
    queryKey: ['org'],
    queryFn: api.org.get,
  })

  const currentPlan = (org?.plan ?? 'trial') as Plan

  const handleUpgrade = async (planId: 'starter' | 'pro' | 'business') => {
    setLoading(planId)
    try {
      const { url } = await api.stripe.createCheckout(planId)
      if (url) window.location.href = url
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  const handlePortal = async () => {
    setLoading('portal')
    try {
      const { url } = await api.stripe.openPortal()
      if (url) window.open(url, '_blank')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  const handleExportToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  const downloadCSV = async (url: string) => {
    const token = await handleExportToken()
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) { alert('Export échoué'); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = url.split('/').pop()!.split('?')[0] + '.csv'
    a.click()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
        <p className="text-gray-500 text-sm mt-1">
          Plan actuel : <span className="font-medium text-gray-900">{PLAN_LABELS[currentPlan]}</span>
          {org?.plan_expires_at && (
            <> · Expire le {new Date(org.plan_expires_at).toLocaleDateString('fr-FR')}</>
          )}
        </p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">
            Abonnement activé ! Votre plan a été mis à jour.
          </p>
        </div>
      )}
      {cancelled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">Paiement annulé. Vous pouvez réessayer à tout moment.</p>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id
          const isHigher = ['starter', 'pro', 'business'].indexOf(plan.id) >
                          ['trial', 'starter', 'pro', 'business'].indexOf(currentPlan)

          return (
            <div
              key={plan.id}
              className={`card p-6 flex flex-col relative ${
                plan.highlight ? 'ring-2 ring-primary-500 shadow-lg' : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Recommandé
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={`w-10 h-10 rounded-xl ${plan.bg} flex items-center justify-center mb-4`}>
                <plan.icon size={20} className={plan.color} />
              </div>

              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-1 mb-2">
                <span className="text-3xl font-bold text-gray-900">{plan.price}€</span>
                <span className="text-gray-500 text-sm">/mois</span>
              </div>
              <p className="text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">{plan.limits}</p>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle size={14} className="text-primary-600 mt-0.5 shrink-0" />
                    <span className={f.startsWith('Tout') ? 'text-gray-500 italic' : 'text-gray-700'}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className={`w-full py-2.5 rounded-lg text-center text-sm font-medium ${plan.bg} ${plan.color} border ${plan.border}`}>
                  Plan actuel
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={!!loading}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                    plan.highlight
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'btn-secondary'
                  }`}
                >
                  {loading === plan.id ? '…' : isHigher ? `Passer en ${plan.name}` : `Choisir ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Manage subscription */}
      {currentPlan !== 'trial' && (
        <div className="card p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Gérer votre abonnement</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Factures, méthode de paiement, annulation — via le portail Stripe sécurisé.
            </p>
          </div>
          <button
            onClick={handlePortal}
            disabled={loading === 'portal'}
            className="btn-secondary flex items-center gap-2 text-sm shrink-0"
          >
            <ExternalLink size={15} />
            {loading === 'portal' ? '…' : 'Portail Stripe'}
          </button>
        </div>
      )}

      {/* Exports */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Exports de données</h3>
        <p className="text-sm text-gray-500 mb-4">Téléchargez vos données au format CSV (compatible Excel).</p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => downloadCSV(api.exports.dossiersUrl())}
            className="btn-secondary text-sm"
          >
            Exporter tous les dossiers
          </button>
          <button
            onClick={() => downloadCSV(api.exports.sitesUrl())}
            className="btn-secondary text-sm"
          >
            Exporter les parkings
          </button>
        </div>
      </div>

      {/* Trial banner */}
      {currentPlan === 'trial' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-medium text-amber-900 mb-1">Essai gratuit en cours</p>
          <p className="text-sm text-amber-700">
            Vous pouvez créer jusqu'à 3 dossiers en essai. Passez à un plan payant pour débloquer toutes les fonctionnalités.
          </p>
        </div>
      )}
    </div>
  )
}
