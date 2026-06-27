import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  role: string
  organization_id: string | null
  onboarding_done: boolean
}

interface AuthState {
  userId: string | null
  orgId: string | null
  profile: Profile | null
  initialized: boolean
  setSession: (userId: string) => void
  fetchProfile: () => Promise<void>
  signOut: () => Promise<void>
  clear: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  orgId: null,
  profile: null,
  initialized: false,

  setSession: (userId) => set({ userId }),

  fetchProfile: async () => {
    const { userId } = get()
    if (!userId) return

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, organization_id, onboarding_done')
      .eq('id', userId)
      .single()

    if (data) {
      set({
        profile: data as Profile,
        orgId: data.organization_id,
        initialized: true,
      })
    } else {
      set({ initialized: true })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ userId: null, orgId: null, profile: null, initialized: false })
  },

  clear: () => set({ userId: null, orgId: null, profile: null, initialized: false }),
}))
