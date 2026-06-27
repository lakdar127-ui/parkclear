import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useRouter, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const { setSession, fetchProfile, clear, initialized } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session.user.id)
        fetchProfile()
      } else {
        clear()
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session.user.id)
        fetchProfile()
      } else {
        clear()
        router.replace('/auth/login')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="app/index"  options={{ headerShown: false }} />
      <Stack.Screen name="new-dossier" options={{ headerShown: false }} />
      <Stack.Screen name="dossier/[id]" options={{
        headerShown: true,
        headerTitle: 'Dossier',
        headerBackTitle: 'Retour',
        headerTintColor: '#16a34a',
      }} />
    </Stack>
  )
}
