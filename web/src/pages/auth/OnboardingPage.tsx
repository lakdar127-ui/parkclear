import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { api, type CreateOrgPayload, type CreateSitePayload } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

// ── Schemas ──────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, 'Requis'),
  siret: z.string().regex(/^\d{14}$/, 'SIRET : 14 chiffres').or(z.literal('')).optional(),
  address: z.string().min(5, 'Requis'),
  city: z.string().min(2, 'Requis'),
  postal_code: z.string().regex(/^\d{5}$/, '5 chiffres requis'),
  signer_name: z.string().min(2, 'Requis'),
  signer_title: z.string().min(2, 'Requis'),
})

const step2Schema = z.object({
  name: z.string().min(2, 'Requis'),
  address: z.string().min(5, 'Requis'),
  city: z.string().min(2, 'Requis'),
  postal_code: z.string().regex(/^\d{5}$/, '5 chiffres requis'),
  type: z.enum(['open', 'closed', 'mixed']),
  total_places: z.coerce.number().int().positive().optional(),
})

const step3Schema = z.object({
  agent_email: z.string().email('Email invalide').or(z.literal('')),
})

type Step1Form = z.infer<typeof step1Schema>
type Step2Form = z.infer<typeof step2Schema>
type Step3Form = z.infer<typeof step3Schema>

// ── Composant principal ──────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Votre entreprise' },
  { id: 2, label: 'Votre parking' },
  { id: 3, label: 'Votre équipe' },
  { id: 4, label: 'Votre plan' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { fetchProfile, user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [_orgId, setOrgId] = useState<string | null>(null)
  const [siteId, setSiteId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // ── Mutations ────────────────────────────────────────────────
  const createOrg = useMutation({ mutationFn: api.org.create })
  const createSite = useMutation({ mutationFn: api.sites.create })
  const inviteAgent = useMutation({
    mutationFn: ({ email, siteId }: { email: string; siteId?: string }) =>
      api.auth.inviteAgent(email, siteId),
  })

  // ── Step 1 — Infos entreprise ───────────────────────────────
  const form1 = useForm<Step1Form>({ resolver: zodResolver(step1Schema) })

  const submitStep1 = form1.handleSubmit(async (values) => {
    setError('')
    try {
      const org = await createOrg.mutateAsync(values as CreateOrgPayload)
      setOrgId(org.id)
      setStep(2)
    } catch (e: any) {
      setError(e.message)
    }
  })

  // ── Step 2 — Premier parking ─────────────────────────────────
  const form2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { type: 'open' },
  })

  const submitStep2 = form2.handleSubmit(async (values) => {
    setError('')
    try {
      const site = await createSite.mutateAsync(values as CreateSitePayload)
      setSiteId(site.id)
      setStep(3)
    } catch (e: any) {
      setError(e.message)
    }
  })

  // ── Step 3 — Inviter un agent ────────────────────────────────
  const form3 = useForm<Step3Form>({ resolver: zodResolver(step3Schema) })

  const submitStep3 = form3.handleSubmit(async (values) => {
    setError('')
    if (values.agent_email) {
      try {
        await inviteAgent.mutateAsync({ email: values.agent_email, siteId: siteId ?? undefined })
      } catch (e: any) {
        setError(e.message)
        return
      }
    }
    setStep(4)
  })

  // ── Step 4 — Plan (redirect Stripe ou dashboard) ─────────────
  const finishOnboarding = async () => {
    if (!user) return
    // Marquer l'onboarding comme fait
    await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    await fetchProfile(user.id)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🅿</span>
          </div>
          <span className="font-bold text-gray-900">ParkClear</span>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${step > s.id ? 'bg-primary-600 text-white' :
                  step === s.id ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                  'bg-gray-200 text-gray-500'}
              `}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span className={`text-xs hidden sm:block ${step >= s.id ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 ${step > s.id ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="card p-8 w-full max-w-lg">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <form onSubmit={submitStep1} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Votre entreprise</h2>
              <p className="text-sm text-gray-500 mt-1">
                Ces informations seront utilisées dans vos documents légaux.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Raison sociale *</label>
                <input {...form1.register('name')} className="input" placeholder="SCI Parkings du Centre" />
                {form1.formState.errors.name && <p className="error-text">{form1.formState.errors.name.message}</p>}
              </div>

              <div>
                <label className="label">SIRET</label>
                <input {...form1.register('siret')} className="input" placeholder="12345678901234" />
                {form1.formState.errors.siret && <p className="error-text">{form1.formState.errors.siret.message}</p>}
              </div>

              <div>
                <label className="label">Code postal *</label>
                <input {...form1.register('postal_code')} className="input" placeholder="75001" />
                {form1.formState.errors.postal_code && <p className="error-text">{form1.formState.errors.postal_code.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="label">Adresse *</label>
                <input {...form1.register('address')} className="input" placeholder="12 rue de la Paix" />
                {form1.formState.errors.address && <p className="error-text">{form1.formState.errors.address.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="label">Ville *</label>
                <input {...form1.register('city')} className="input" placeholder="Paris" />
              </div>

              <div>
                <label className="label">Nom du signataire *</label>
                <input {...form1.register('signer_name')} className="input" placeholder="Jean Dupont" />
                {form1.formState.errors.signer_name && <p className="error-text">{form1.formState.errors.signer_name.message}</p>}
              </div>

              <div>
                <label className="label">Qualité *</label>
                <input {...form1.register('signer_title')} className="input" placeholder="Directeur d'exploitation" />
                {form1.formState.errors.signer_title && <p className="error-text">{form1.formState.errors.signer_title.message}</p>}
              </div>
            </div>

            {error && <p className="error-text text-base">{error}</p>}

            <button type="submit" disabled={createOrg.isPending} className="btn-primary w-full py-2.5">
              {createOrg.isPending ? 'Enregistrement...' : 'Continuer →'}
            </button>
          </form>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <form onSubmit={submitStep2} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Votre premier parking</h2>
              <p className="text-sm text-gray-500 mt-1">
                Vous pourrez en ajouter d'autres depuis le dashboard.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nom du parking *</label>
                <input {...form2.register('name')} className="input" placeholder="Parking Centre Commercial A" />
                {form2.formState.errors.name && <p className="error-text">{form2.formState.errors.name.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="label">Adresse *</label>
                <input {...form2.register('address')} className="input" placeholder="12 avenue du Commerce" />
              </div>

              <div>
                <label className="label">Ville *</label>
                <input {...form2.register('city')} className="input" placeholder="Paris" />
              </div>

              <div>
                <label className="label">Code postal *</label>
                <input {...form2.register('postal_code')} className="input" placeholder="75001" />
              </div>

              <div className="col-span-2">
                <label className="label">Type d'accès *</label>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {[
                    { value: 'open', label: '🌐 Ouvert', desc: 'Accessible au public' },
                    { value: 'closed', label: '🔒 Fermé', desc: 'Accès restreint' },
                    { value: 'mixed', label: '🔄 Mixte', desc: 'Parties ouvertes et fermées' },
                  ].map((opt) => (
                    <label key={opt.value} className={`
                      relative flex flex-col items-center p-3 border rounded-lg cursor-pointer text-center transition-colors
                      ${form2.watch('type') === opt.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'}
                    `}>
                      <input type="radio" value={opt.value} {...form2.register('type')} className="sr-only" />
                      <span className="text-xl mb-1">{opt.label.split(' ')[0]}</span>
                      <span className="text-xs font-medium text-gray-900">{opt.label.split(' ')[1]}</span>
                      <span className="text-xs text-gray-400">{opt.desc}</span>
                    </label>
                  ))}
                </div>

                <div className={`
                  mt-2 p-3 rounded-lg text-xs
                  ${form2.watch('type') === 'closed'
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-blue-50 border border-blue-200 text-blue-700'}
                `}>
                  {form2.watch('type') === 'closed'
                    ? '⚠️ Parking fermé : la procédure légale est plus complexe. ParkClear vous guidera.'
                    : '✅ Parking ouvert : procédure standard (4-8 semaines).'}
                </div>
              </div>

              <div>
                <label className="label">Nombre de places</label>
                <input {...form2.register('total_places')} type="number" className="input" placeholder="250" />
              </div>
            </div>

            {error && <p className="error-text text-base">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                ← Retour
              </button>
              <button type="submit" disabled={createSite.isPending} className="btn-primary flex-1">
                {createSite.isPending ? 'Enregistrement...' : 'Continuer →'}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <form onSubmit={submitStep3} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inviter un agent terrain</h2>
              <p className="text-sm text-gray-500 mt-1">
                Vos agents utilisent l'app mobile pour signaler les véhicules.
                Vous pouvez inviter plusieurs agents depuis le dashboard.
              </p>
            </div>

            <div>
              <label className="label">Email de l'agent (optionnel)</label>
              <input
                {...form3.register('agent_email')}
                type="email"
                className="input"
                placeholder="agent@votre-parking.fr"
              />
              {form3.formState.errors.agent_email && (
                <p className="error-text">{form3.formState.errors.agent_email.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Il recevra un email d'invitation avec un lien pour créer son compte.
              </p>
            </div>

            {error && <p className="error-text text-base">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                ← Retour
              </button>
              <button type="submit" disabled={inviteAgent.isPending} className="btn-primary flex-1">
                {inviteAgent.isPending ? 'Envoi...' : 'Continuer →'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="text-sm text-gray-400 hover:text-gray-600 w-full text-center"
            >
              Passer cette étape
            </button>
          </form>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Choisissez votre plan</h2>
              <p className="text-sm text-gray-500 mt-1">
                30 jours gratuits sur tous les plans. Sans carte bancaire.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { plan: 'starter', price: '29€', label: 'Starter', dossiers: '5 dossiers/mois', sites: '1 site' },
                { plan: 'pro', price: '59€', label: 'Pro', dossiers: '20 dossiers/mois', sites: '5 sites', recommended: true },
                { plan: 'business', price: '99€', label: 'Business', dossiers: 'Illimité', sites: 'Illimité' },
              ].map((p) => (
                <div key={p.plan} className={`
                  relative border rounded-xl p-4 flex items-center justify-between cursor-pointer
                  ${p.recommended ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
                `}>
                  {p.recommended && (
                    <span className="absolute -top-2.5 left-4 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                      Recommandé
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{p.label}</p>
                    <p className="text-xs text-gray-500">{p.dossiers} · {p.sites}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">{p.price}</p>
                    <p className="text-xs text-gray-400">/mois</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              🎁 <strong>Offre client fondateur</strong> : 3 mois offerts + tarif garanti 24 mois.
              Disponible jusqu'au 31 juillet 2026.
            </div>

            <button onClick={finishOnboarding} className="btn-primary w-full py-2.5">
              Commencer l'essai gratuit →
            </button>

            <p className="text-xs text-gray-400 text-center">
              Paiement uniquement après 30 jours. Résiliable à tout moment.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
