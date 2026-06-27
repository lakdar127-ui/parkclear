import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Network from 'expo-network'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { enqueueDossier } from '../../lib/offlineQueue'
import { useDossierDraftStore } from '../../stores/dossierDraftStore'

const VEHICLE_LABELS: Record<string, string> = {
  va: 'Véhicule Abandonné (VA)',
  epave: 'Épave',
  unknown: 'Type inconnu',
}

export default function ConfirmStep() {
  const router = useRouter()
  const draft = useDossierDraftStore()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Check connectivity
      const net = await Network.getNetworkStateAsync()

      if (!net.isConnected || !net.isInternetReachable) {
        // Save to offline queue
        await enqueueDossier({
          vehicleType: draft.vehicleType,
          plate: draft.plate || null,
          noPlate: draft.noPlate,
          siteId: draft.siteId,
          locationSpot: draft.locationSpot || null,
          vehicleBrand: draft.vehicleBrand || null,
          vehicleColor: draft.vehicleColor || null,
          notes: draft.notes || null,
          photoUris: draft.photos.map((p) => p.uri),
        })

        Alert.alert(
          'Sauvegardé hors ligne',
          'Pas de connexion internet. Le signalement sera envoyé automatiquement dès que vous serez connecté.',
          [{ text: 'OK', onPress: () => { draft.reset(); router.replace('/app/') } }]
        )
        return
      }

      // 1. Create dossier via API
      const { dossier } = await api.post<{ dossier: { id: string } }>('/api/dossiers', {
        site_id:        draft.siteId,
        plate:          draft.noPlate ? undefined : (draft.plate || undefined),
        no_plate:       draft.noPlate,
        vehicle_type:   draft.vehicleType,
        vehicle_brand:  draft.vehicleBrand || undefined,
        vehicle_color:  draft.vehicleColor || undefined,
        location_spot:  draft.locationSpot || undefined,
        notes:          draft.notes || undefined,
      })

      // 2. Upload each photo to Supabase Storage
      for (const photo of draft.photos) {
        const fileName = `${dossier.id}/${photo.type}_${Date.now()}.jpg`

        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, decode(base64), {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError.message)
          continue
        }

        // 3. Register photo in DB
        await api.post(`/api/dossiers/${dossier.id}/photos`, {
          storage_path: fileName,
          photo_type:   photo.type,
          taken_at:     new Date().toISOString(),
        })
      }

      draft.reset()
      Alert.alert(
        'Signalement créé !',
        `Dossier ${dossier.id.slice(0, 8).toUpperCase()} créé avec ${draft.photos.length} photo(s).`,
        [{ text: 'OK', onPress: () => router.replace('/app/') }]
      )
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.step}>Étape 5/5 — Récapitulatif</Text>

        <Text style={styles.title}>Confirmer le signalement</Text>
        <Text style={styles.subtitle}>Vérifiez les informations avant d'envoyer.</Text>

        {/* Recap card */}
        <View style={styles.card}>
          <Row label="Type" value={VEHICLE_LABELS[draft.vehicleType]} />
          <Divider />
          <Row
            label="Plaque"
            value={draft.noPlate ? 'Illisible / absente' : (draft.plate || '—')}
            highlight={!draft.noPlate && !!draft.plate}
          />
          {draft.vehicleBrand ? <><Divider /><Row label="Marque" value={draft.vehicleBrand} /></> : null}
          {draft.vehicleColor ? <><Divider /><Row label="Couleur" value={draft.vehicleColor} /></> : null}
          <Divider />
          <Row label="Photos" value={`${draft.photos.length} photo${draft.photos.length > 1 ? 's' : ''}`} />
          <Divider />
          <Row label="Spot" value={draft.locationSpot || 'Non renseigné'} />
        </View>

        {/* Photo thumbnails */}
        <Text style={styles.sectionTitle}>Photos ({draft.photos.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {draft.photos.map((p, i) => (
            <View key={i} style={styles.thumb}>
              <Image source={{ uri: p.uri }} style={styles.thumbImg} />
              <Text style={styles.thumbLabel}>{p.type}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Legal notice */}
        <View style={styles.legal}>
          <Text style={styles.legalText}>
            En soumettant ce signalement, vous attestez que les informations sont exactes et que le véhicule se trouve bien sur votre parking privé. Ce signalement déclenche la procédure légale prévue par le Code de la route (Art. L325-12).
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.editBtnText}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Envoyer le signalement</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, highlight && rowStyles.valueHighlight]}>{value}</Text>
    </View>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  label: { fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, fontWeight: '500', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  valueHighlight: { color: '#16a34a', fontWeight: '700' },
})

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#16a34a' },
  step: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  photoRow: { marginBottom: 20 },
  thumb: { marginRight: 10, alignItems: 'center', gap: 4 },
  thumbImg: { width: 80, height: 80, borderRadius: 10 },
  thumbLabel: { fontSize: 11, color: '#9ca3af' },
  legal: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  legalText: { fontSize: 11, color: '#9ca3af', lineHeight: 16 },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  submitBtn: {
    flex: 2,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#d1d5db' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
