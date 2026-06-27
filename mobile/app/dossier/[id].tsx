import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Image, Alert, SafeAreaView, Dimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface Photo {
  id: string
  storage_path: string
  photo_type: string
  taken_at: string
}

interface Dossier {
  id: string
  plate: string | null
  no_plate: boolean
  vehicle_type: string
  vehicle_brand: string | null
  vehicle_color: string | null
  location_spot: string | null
  location_notes: string | null
  status: string
  lrar_sent_at: string | null
  deadline_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  sites: { id: string; name: string; address: string; city: string } | null
  profiles: { full_name: string | null; phone: string | null } | null
  photos: Photo[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  open:             { label: 'En attente',       color: '#92400e', bg: '#fef3c7', icon: '⏳' },
  validated:        { label: 'Validé',            color: '#1e40af', bg: '#dbeafe', icon: '✅' },
  lrar_sent:        { label: 'LRAR envoyée',      color: '#7c3aed', bg: '#ede9fe', icon: '📬' },
  deadline_running: { label: 'Délai en cours',    color: '#d97706', bg: '#fef3c7', icon: '⏱' },
  deadline_expired: { label: 'Délai expiré',      color: '#b91c1c', bg: '#fee2e2', icon: '⚠️' },
  opj_contacted:    { label: 'OPJ saisi',         color: '#0369a1', bg: '#e0f2fe', icon: '👮' },
  removal_scheduled:{ label: 'Enlèvement prévu',  color: '#059669', bg: '#d1fae5', icon: '🚛' },
  resolved:         { label: 'Résolu',            color: '#16a34a', bg: '#dcfce7', icon: '🎉' },
  cancelled:        { label: 'Annulé',            color: '#6b7280', bg: '#f3f4f6', icon: '✖' },
}

const TIMELINE: { status: string; label: string }[] = [
  { status: 'open',              label: 'Signalement créé' },
  { status: 'validated',         label: 'Dossier validé' },
  { status: 'lrar_sent',         label: 'LRAR envoyée' },
  { status: 'deadline_running',  label: 'Délai 10j en cours' },
  { status: 'deadline_expired',  label: 'Délai expiré' },
  { status: 'opj_contacted',     label: 'OPJ contacté' },
  { status: 'removal_scheduled', label: 'Enlèvement planifié' },
  { status: 'resolved',          label: 'Dossier clôturé' },
]

const STATUS_ORDER = TIMELINE.map((t) => t.status)

export default function DossierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  const load = async () => {
    try {
      const { dossier: data } = await api.get<{ dossier: Dossier }>(`/api/dossiers/${id}`)
      setDossier(data)

      // Get signed URLs for photos
      if (data.photos && data.photos.length > 0) {
        const urls: Record<string, string> = {}
        for (const photo of data.photos) {
          const { data: signed } = await supabase.storage
            .from('photos')
            .createSignedUrl(photo.storage_path, 3600)
          if (signed) urls[photo.id] = signed.signedUrl
        }
        setPhotoUrls(urls)
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const validateDossier = async () => {
    Alert.alert(
      'Valider le dossier',
      'Confirmer que le signalement est correct et déclencher la procédure légale ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            try {
              await api.patch(`/api/dossiers/${id}`, { status: 'validated' })
              load()
            } catch (err: any) {
              Alert.alert('Erreur', err.message)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  if (!dossier) {
    return (
      <View style={styles.centered}>
        <Text>Dossier introuvable.</Text>
      </View>
    )
  }

  const statusCfg = STATUS_CONFIG[dossier.status] ?? STATUS_CONFIG.open
  const currentStep = STATUS_ORDER.indexOf(dossier.status)

  const createdDate = new Date(dossier.created_at)
  const daysOpen = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Status header */}
        <View style={[styles.statusBanner, { backgroundColor: statusCfg.bg }]}>
          <Text style={styles.statusIcon}>{statusCfg.icon}</Text>
          <View>
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            <Text style={styles.statusMeta}>
              Jour {daysOpen === 0 ? '1' : daysOpen} · {createdDate.toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        {/* Vehicle info */}
        <Section title="Véhicule">
          <InfoRow label="Plaque" value={dossier.no_plate ? 'Illisible / absente' : (dossier.plate ?? '—')} bold />
          <InfoRow label="Type" value={dossier.vehicle_type === 'va' ? 'Véhicule Abandonné' : dossier.vehicle_type === 'epave' ? 'Épave' : 'Inconnu'} />
          {dossier.vehicle_brand && <InfoRow label="Marque" value={dossier.vehicle_brand} />}
          {dossier.vehicle_color && <InfoRow label="Couleur" value={dossier.vehicle_color} />}
        </Section>

        {/* Location */}
        <Section title="Localisation">
          <InfoRow label="Site" value={dossier.sites?.name ?? '—'} />
          <InfoRow label="Adresse" value={dossier.sites ? `${dossier.sites.address}, ${dossier.sites.city}` : '—'} />
          {dossier.location_spot && <InfoRow label="Place" value={dossier.location_spot} />}
          {dossier.location_notes && <InfoRow label="Notes" value={dossier.location_notes} />}
        </Section>

        {/* Photos */}
        {dossier.photos && dossier.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({dossier.photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dossier.photos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  {photoUrls[photo.id] ? (
                    <Image source={{ uri: photoUrls[photo.id] }} style={styles.photoImg} />
                  ) : (
                    <View style={[styles.photoImg, styles.photoPlaceholder]}>
                      <ActivityIndicator color="#16a34a" />
                    </View>
                  )}
                  <Text style={styles.photoLabel}>{photo.photo_type}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Procédure légale</Text>
          {TIMELINE.map((step, i) => {
            const done = i < currentStep
            const active = i === currentStep
            const future = i > currentStep
            return (
              <View key={step.status} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    done && styles.timelineDotDone,
                    active && styles.timelineDotActive,
                  ]}>
                    {done && <Text style={styles.timelineDotText}>✓</Text>}
                  </View>
                  {i < TIMELINE.length - 1 && (
                    <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                  )}
                </View>
                <Text style={[
                  styles.timelineLabel,
                  done && styles.timelineLabelDone,
                  active && styles.timelineLabelActive,
                  future && styles.timelineLabelFuture,
                ]}>
                  {step.label}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Agent info */}
        <Section title="Signalé par">
          <InfoRow label="Agent" value={dossier.profiles?.full_name ?? 'Inconnu'} />
          <InfoRow label="Dossier ID" value={dossier.id.slice(0, 8).toUpperCase()} />
        </Section>

        {dossier.notes && (
          <Section title="Notes">
            <Text style={styles.notes}>{dossier.notes}</Text>
          </Section>
        )}

        {dossier.lrar_sent_at && (
          <Section title="Procédure">
            <InfoRow label="LRAR envoyée le" value={new Date(dossier.lrar_sent_at).toLocaleDateString('fr-FR')} />
            {dossier.deadline_at && (
              <InfoRow label="Délai expire le" value={new Date(dossier.deadline_at).toLocaleDateString('fr-FR')} bold />
            )}
          </Section>
        )}
      </ScrollView>

      {/* Footer actions */}
      {dossier.status === 'open' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.validateBtn} onPress={validateDossier} activeOpacity={0.85}>
            <Text style={styles.validateBtnText}>Valider le dossier</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  )
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, bold && styles.infoValueBold]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 16,
  },
  statusIcon: { fontSize: 28 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  statusMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, color: '#111827', maxWidth: '55%', textAlign: 'right' },
  infoValueBold: { fontWeight: '700' },
  photoCard: { marginRight: 10, alignItems: 'center', gap: 4 },
  photoImg: { width: 100, height: 100, borderRadius: 10 },
  photoPlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  photoLabel: { fontSize: 11, color: '#9ca3af' },
  notes: { fontSize: 14, color: '#374151', lineHeight: 20, padding: 14, backgroundColor: '#fff', borderRadius: 12 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 22 },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotDone: { backgroundColor: '#16a34a' },
  timelineDotActive: { backgroundColor: '#f59e0b', borderWidth: 2, borderColor: '#d97706' },
  timelineDotText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  timelineLine: { width: 2, height: 24, backgroundColor: '#e5e7eb', marginTop: 0 },
  timelineLineDone: { backgroundColor: '#16a34a' },
  timelineLabel: { fontSize: 14, color: '#6b7280', paddingTop: 2, marginBottom: 16 },
  timelineLabelDone: { color: '#16a34a' },
  timelineLabelActive: { color: '#111827', fontWeight: '600' },
  timelineLabelFuture: { color: '#d1d5db' },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  validateBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  validateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
