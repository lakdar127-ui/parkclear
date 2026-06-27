import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

import LoginPage from '@/pages/auth/LoginPage'
import OnboardingPage from '@/pages/auth/OnboardingPage'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import DossiersPage from '@/pages/dossiers/DossiersPage'
import DossierDetailPage from '@/pages/dossiers/DossierDetailPage'
import SubscriptionPage from '@/pages/settings/SubscriptionPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!profile?.organization_id || !profile.onboarding_done) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { setUser, setSession, setProfile, setLoading, setInitialized, fetchProfile } =
    useAuthStore()

  useEffect(() => {
    // Initialisation : récupérer la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          setLoading(false)
          setInitialized(true)
        })
      } else {
        setLoading(false)
        setInitialized(true)
      }
    })

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><LoginPage isSignup /></AuthRoute>} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* App protégée */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dossiers" element={<DossiersPage />} />
        <Route path="/dossiers/:id" element={<DossierDetailPage />} />
        <Route path="/settings/subscription" element={<SubscriptionPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
