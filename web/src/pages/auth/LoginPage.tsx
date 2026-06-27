import { useState } from 'react'
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

export default function LoginPage({ isSignup = false }: { isSignup?: boolean }) {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

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
        const { error } = await supabase.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            data: { full_name: v.full_name },
            emailRedirectTo: `${window.location.origin}/onboarding`,
          },
        })
        if (error) throw error
        setSuccessMsg('Vérifiez votre email pour confirmer votre compte.')
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
      setServerError(err.message ?? 'Une erreur est survenue')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🅿</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">ParkClear</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isSignup ? 'Créer votre compte' : 'Connexion'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignup
              ? 'Essai gratuit 30 jours — sans carte bancaire'
              : 'Bienvenue, content de vous revoir'}
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            {isSignup && (
              <div>
                <label className="label">Nom complet</label>
                <input
                  {...register('full_name')}
                  className="input"
                  placeholder="Jean Dupont"
                  autoComplete="name"
                />
                {(errors as any).full_name && (
                  <p className="error-text">{(errors as any).full_name.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="label">Email professionnel</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="jean@entreprise.fr"
                autoComplete="email"
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Mot de passe</label>
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
                <input
                  {...register('confirm_password')}
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {(errors as any).confirm_password && (
                  <p className="error-text">{(errors as any).confirm_password.message}</p>
                )}
              </div>
            )}

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {serverError}
              </div>
            )}

            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5"
            >
              {isSubmitting
                ? 'Chargement...'
                : isSignup
                ? 'Créer mon compte →'
                : 'Se connecter →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isSignup ? (
              <>
                Déjà un compte ?{' '}
                <Link to="/login" className="text-primary-600 hover:underline font-medium">
                  Se connecter
                </Link>
              </>
            ) : (
              <>
                Pas encore de compte ?{' '}
                <Link to="/signup" className="text-primary-600 hover:underline font-medium">
                  Essai gratuit 30 jours
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          En continuant, vous acceptez nos{' '}
          <a href="/cgu" className="underline">CGU</a> et notre{' '}
          <a href="/privacy" className="underline">politique de confidentialité</a>.
        </p>
      </div>
    </div>
  )
}
