import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Minimum 2 caractères'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

type LoginForm = z.infer<typeof loginSchema>
type SignupForm = z.infer<typeof signupSchema>

const FEATURES = [
  "Signalement photo en 2 minutes par l'agent terrain",
  'Mise en demeure LRAR générée automatiquement',
  "Suivi légal guidé jusqu'à la mise en fourrière",
  'Dashboard temps réel multi-sites',
]

const STATS = [
  { value: '500+', label: 'Parkings actifs' },
  { value: '12 000+', label: 'Dossiers traités' },
  { value: '98%', label: 'Taux de succès' },
]

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function LoginPage({ isSignup = false }: { isSignup?: boolean }) {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Ping backend on mount to wake up Render from cold start
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/health`).catch(() => {})
  }, [])

  const schema = isSignup ? signupSchema : loginSchema
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(schema as any) })

  const onSubmit = async (values: SignupForm | LoginForm) => {
    setServerError('')
    setSuccessMsg('')
    try {
      if (isSignup) {
        const v = values as SignupForm
        const { data, error } = await supabase.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            data: { full_name: v.full_name },
            emailRedirectTo: `${window.location.origin}/onboarding`,
          },
        })
        if (error) throw error
        if (data.session) {
          navigate('/onboarding')
          return
        }
        setSuccessMsg('Compte créé ! Vérifiez votre email pour confirmer.')
      } else {
        const v = values as LoginForm
        const { error } = await supabase.auth.signInWithPassword({
          email: v.email,
          password: v.password,
        })
        if (error) throw error
        navigate('/dashboard')
      }
    } catch (err: any) {
      const raw = err?.message || err?.error_description || err?.code || ''
      if (!raw || raw === '{}') {
        setServerError('Erreur de connexion. Vérifiez vos identifiants.')
      } else if (raw.includes('Invalid login credentials')) {
        setServerError('Email ou mot de passe incorrect.')
      } else if (raw.includes('Email not confirmed')) {
        setServerError('Confirmez votre email avant de vous connecter (vérifiez votre boîte mail).')
      } else if (raw.includes('already registered')) {
        setServerError('Un compte existe déjà avec cet email. Connectez-vous directement.')
      } else {
        setServerError(raw)
      }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel gauche — branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-slate-900 flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-600 rounded-full opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-400 rounded-full opacity-5 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">ParkClear</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            La procédure légale<br />
            pour véhicules abandonnés,<br />
            <span className="text-primary-400">enfin automatisée.</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-12 max-w-md">
            De la détection sur le parking à la mise en fourrière — sans erreur juridique, sans délai inutile.
          </p>

          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-600/20 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon />
                </div>
                <span className="text-slate-300 text-sm leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 pt-10 border-t border-slate-800">
          {STATS.map((s, i) => (
            <div key={i}>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-slate-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel droit — formulaire */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">P</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">ParkClear</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5">
              {isSignup ? 'Créer votre compte' : 'Connexion'}
            </h2>
            <p className="text-gray-500 text-sm">
              {isSignup ? '30 jours gratuits — sans carte bancaire' : 'Bienvenue, content de vous revoir'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            {isSignup && (
              <div>
                <label className="label">Nom complet</label>
                <input {...register('full_name')} className="input" placeholder="Jean Dupont" autoComplete="name" />
                {(errors as any).full_name && <p className="error-text">{(errors as any).full_name.message}</p>}
              </div>
            )}

            <div>
              <label className="label">Email professionnel</label>
              <input {...register('email')} type="email" className="input" placeholder="jean@entreprise.fr" autoComplete="email" />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Mot de passe</label>
                {!isSignup && (
                  <a href="#" className="text-xs text-primary-600 hover:underline">Mot de passe oublié ?</a>
                )}
              </div>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            {isSignup && (
              <div>
                <label className="label">Confirmer le mot de passe</label>
                <input {...register('confirm_password')} type="password" className="input" placeholder="••••••••" autoComplete="new-password" />
                {(errors as any).confirm_password && <p className="error-text">{(errors as any).confirm_password.message}</p>}
              </div>
            )}

            {serverError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5 text-base mt-2">
              {isSubmitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Chargement...
                </span>
              ) : isSignup ? 'Créer mon compte →' : 'Se connecter →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isSignup ? (
              <>
                Déjà un compte ?{' '}
                <Link to="/login" className="text-primary-600 hover:underline font-medium">Se connecter</Link>
              </>
            ) : (
              <>
                Pas encore de compte ?{' '}
                <Link to="/signup" className="text-primary-600 hover:underline font-medium">Essai gratuit 30 jours</Link>
              </>
            )}
          </p>

          {isSignup && (
            <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
              En créant un compte, vous acceptez nos{' '}
              <a href="#" className="underline hover:text-gray-600">CGU</a> et notre{' '}
              <a href="#" className="underline hover:text-gray-600">politique de confidentialité</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
