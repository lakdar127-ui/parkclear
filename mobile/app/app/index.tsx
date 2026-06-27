import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

interface Dossier {
  id: string
  plate: string | null
  vehicle_type: 'va' | 'epave' | 'unknown'
  status: string
  location_spot: string | null
  created_at: string
  sites: { name: string } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:                { label: 'En attente',         color: '#92400e', bg: '#fef3c7' },
  validated:           { label: 'Validé',             color: '#1e40af', bg: '#dbeafe' },
  lrar_sent:           { label: 'LRAR envoyée',       color: '#7c3aed', bg: '#ede9fe' },
  deadline_running:    { label: 'Délai en cours',     color: '#d97706', bg: '#fef3c7' },
  deadline_expired:    { label: '⚠️ Délai expiré',   color: '#b91c1c', bg: '#fee2e2' },
  opj_contacted:       { label: 'OPJ saisi',          color: '#0369a1', bg: '#e0f2fe' },
  removal_scheduled:   { label: 'Enlèvement prévu',  color: '#059669', bg: '#d1fae5' },
  resolved:            { label: '✅ Résolu',           color: '#16a34a', bg: '#dcfce7' },
  cancelled:           { label: 'Annulé',             color: '#6b7280', bg: '#f3f4f6' },
}

export default function HomeScreen() {
  const router = useRouter()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [agentName, setAgentName] = useState('')

  const loadData = async () => {
    // Profil de l'agent
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, agent_sites(site_id)')
      .eq('id', user.id)
      .single()

    if (profile) setAgentName(profile.full_name ?? 'Agent')

    // Sites de l'agent
    const siteIds = (profile?.agent_sites as any[] ?? []).map((s: any) => s.site_id)

    // Dossiers de ces sites (hors résolus/annulés)
    const { data } = await supabase
      .from('dossiers')
      .select('id, plate, vehicle_type, status, location_spot, created_at, sites(name)')
      .in('site_id', siteIds.length > 0 ? siteIds : ['00000000-0000-0000-0000-000000000000'])
      .not('status', 'in', '("resolved","cancelled")')
      .order('created_at', { ascending: false })

    setDossiers((data as Dossier[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadData() }, [])

  const onRefresh = () => { setRefreshing(true); loadData() }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {agentName.split(' ')[0]} 👋</Text>
          <Text style={styles.subtitle}>
            {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} actif{dossiers.length > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/new-dossier/type')}
          activeOpacity={0.85}
        >
          <Text style={styles.newBtnText}>+ Signaler</Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <FlatList
        data={dossiers}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>Aucun dossier actif</Text>
            <Text style={styles.emptySubtitle}>
              Appuyez sur "+ Signaler" pour créer votre premier signalement.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = STATUS_LABELS[item.status] ?? { label: item.status, color: '#6b7280', bg: '#f3f4f6' }
          const daysAgo = Math.floor(
            (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/dossier/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>
                  {item.vehicle_type === 'epave' ? '🔧' : '🚗'}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.plate}>
                    {item.plate ?? 'Sans plaque'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {item.sites?.name ?? 'Site inconnu'}
                  {item.location_spot ? ` · ${item.location_spot}` : ''}
                  {' · '}
                  {daysAgo === 0 ? "Aujourd'hui" : `Jour ${daysAgo}`}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  newBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    width: 44,
    height: 44,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  plate: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { fontSize: 12, color: '#9ca3af' },
  chevron: { fontSize: 22, color: '#d1d5db' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
})
