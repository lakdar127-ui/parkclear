import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { useDossierDraftStore } from '../../stores/dossierDraftStore'

const schema = z.object({
  siteId:       z.string().uuid('Sélectionnez un site'),
  locationSpot: z.string().max(20).optional(),
})
type FormValues = z.infer<typeof schema>

interface Site {
  id: string
  name: string
  address: string
  city: string
}

export default function LocationStep() {
  const router = useRouter()
  const { siteId, locationSpot, setSiteId, setLocationSpot } = useDossierDraftStore()
  const [sites, setSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(true)

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { siteId, locationSpot },
  })

  const selectedSiteId = watch('siteId')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get agent's assigned sites
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role, agent_sites(site_id)')
        .eq('id', user.id)
        .single()

      if (!profile) { setLoadingSites(false); return }

      let query = supabase
        .from('sites')
        .select('id, name, address, city')
        .eq('organization_id', profile.organization_id)
        .order('name')

      // Agents only see their assigned sites; managers see all
      if (profile.role === 'agent') {
        const ids = (profile.agent_sites as any[]).map((s: any) => s.site_id)
        if (ids.length > 0) {
          query = query.in('id', ids)
        }
      }

      const { data } = await query
      setSites((data as Site[]) ?? [])
      setLoadingSites(false)

      // Auto-select if only one site
      if (data && data.length === 1 && !siteId) {
        setValue('siteId', data[0].id)
      }
    }
    load()
  }, [])

  const onSubmit = (values: FormValues) => {
    setSiteId(values.siteId)
    setLocationSpot(values.locationSpot ?? '')
    router.push('/new-dossier/confirm')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Progress */}
        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i <= 3 && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.step}>Étape 4/5</Text>

        <Text style={styles.title}>Localisation</Text>
        <Text style={styles.subtitle}>Où se trouve le véhicule ?</Text>

        {/* Site selection */}
        <View style={styles.field}>
          <Text style={styles.label}>Parking / Site *</Text>
          {loadingSites ? (
            <ActivityIndicator color="#16a34a" style={{ marginTop: 12 }} />
          ) : (
            <Controller
              control={control}
              name="siteId"
              render={({ field: { onChange, value } }) => (
                <FlatList
                  data={sites}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.siteCard, value === item.id && styles.siteCardSelected]}
                      onPress={() => onChange(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioOuter, value === item.id && styles.radioOuterSelected]}>
                        {value === item.id && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.siteInfo}>
                        <Text style={[styles.siteName, value === item.id && styles.siteNameSelected]}>
                          {item.name}
                        </Text>
                        <Text style={styles.siteAddr}>{item.address}, {item.city}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.empty}>
                      <Text style={styles.emptyText}>Aucun site assigné.</Text>
                      <Text style={styles.emptyText}>Contactez votre gestionnaire.</Text>
                    </View>
                  }
                />
              )}
            />
          )}
          {errors.siteId && <Text style={styles.error}>{errors.siteId.message}</Text>}
        </View>

        {/* Spot */}
        <View style={styles.field}>
          <Text style={styles.label}>Numéro de place (optionnel)</Text>
          <Controller
            control={control}
            name="locationSpot"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Ex: A-12, Zone B, Niveau -1…"
                placeholderTextColor="#9ca3af"
                value={value}
                onChangeText={onChange}
                autoCapitalize="characters"
                maxLength={20}
              />
            )}
          />
          <Text style={styles.hint}>
            Aidez la fourrière à localiser le véhicule précisément.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !selectedSiteId && styles.btnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!selectedSiteId}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continuer →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 20 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#16a34a' },
  step: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  siteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  siteCardSelected: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: '#16a34a' },
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#16a34a',
  },
  siteInfo: { flex: 1 },
  siteName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  siteNameSelected: { color: '#166534' },
  siteAddr: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  emptyText: { fontSize: 14, color: '#6b7280' },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  btn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#d1d5db' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
