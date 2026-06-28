import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { Shield, TrendingUp, Clock, LayoutDashboard } from 'lucide-react'

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
  { icon: Clock, text: "Signalement photo en 2 minutes par l'agent terrain" },
  { icon: Shield, text: 'Mise en demeure LRAR générée automatiquement' },
  { icon: TrendingUp, text: "Suivi légal guidé jusqu'à la mise en fourrière" },
  { icon: LayoutDashboard, text: 'Dashboard temps réel multi-sites' },
]

const STATS = [
  { value: '500+', label: 'Parkings actifs' },
  { value: '12k+', label: 'Dossiers traités' },
  { value: '98%', label: 'Taux de succès' },
]

export default function LoginPage({ isSignup = false }: { isSignup?: boolean }) {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

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
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── Left panel — branding ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Radial glow */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(45,126,248,0.12) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(123,97,255,0.08) 0%, transparent 65%)' }} />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg text-white"
              style={{ background: 'linear-gradient(135deg, #2D7EF8, #7B61FF)', boxShadow: '0 0 24px rgba(45,126,248,0.4)' }}>
              P
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>ParkClear</span>
            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{ color: '#2D7EF8', background: 'rgba(45,126,248,0.12)', border: '1px solid rgba(45,126,248,0.2)' }}>
              2026
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            La procédure légale<br />
            pour véhicules abandonnés,<br />
            <span style={{ background: 'linear-gradient(135deg, #2D7EF8, #7B61FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              enfin automatisée.
            </span>
          </h1>

          <p className="text-lg leading-relaxed mb-12 max-w-md" style={{ color: 'var(--text-secondary)' }}>
            De la détection sur le parking à la mise en fourrière — sans erreur juridique, sans délai inutile.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(45,126,248,0.12)', border: '1px solid rgba(45,126,248,0.20)' }}>
                  <Icon size={15} style={{ color: '#2D7EF8' }} />
                </div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-6 pt-10"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {STATS.map((s, i) => (
            <div key={i}>
              <div className="text-2xl font-bold kpi-number" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12"
        style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #2D7EF8, #7B61FF)' }}>
              P
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>ParkClear</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              {isSignup ? 'Créer votre compte' : 'Connexion'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
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
                  <a href="#" className="text-xs hover:underline" style={{ color: '#2D7EF8' }}>Mot de passe oublié ?</a>
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
              <div className="flex items-start gap-2.5 text-sm px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,71,87,0.10)', border: '1px solid rgba(255,71,87,0.25)', color: '#FF4757' }}>
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 text-sm px-4 py-3 rounded-xl"
                style={{ background: 'rgba(0,200,150,0.10)', border: '1px solid rgba(0,200,150,0.25)', color: '#00C896' }}>
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base mt-2">
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

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            {isSignup ? (
              <>
                Déjà un compte ?{' '}
                <Link to="/login" className="font-medium hover:underline" style={{ color: '#2D7EF8' }}>Se connecter</Link>
              </>
            ) : (
              <>
                Pas encore de compte ?{' '}
                <Link to="/signup" className="font-medium hover:underline" style={{ color: '#2D7EF8' }}>Essai gratuit 30 jours</Link>
              </>
            )}
          </p>

          {isSignup && (
            <p className="text-center text-xs mt-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              En créant un compte, vous acceptez nos{' '}
              <a href="#" className="underline hover:opacity-80">CGU</a> et notre{' '}
              <a href="#" className="underline hover:opacity-80">politique de confidentialité</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
