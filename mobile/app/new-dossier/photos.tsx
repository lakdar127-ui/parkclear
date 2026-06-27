import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, Alert, Image, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { useDossierDraftStore, PhotoType, DraftPhoto } from '../../stores/dossierDraftStore'

interface PhotoSlot {
  type: PhotoType
  label: string
  icon: string
  required: boolean
  hint: string
}

const SLOTS: PhotoSlot[] = [
  { type: 'plate',  label: 'Plaque',     icon: '🔢', required: true,  hint: 'Cadrez bien la plaque immatriculée' },
  { type: 'front',  label: 'Face avant', icon: '🚗', required: true,  hint: 'Vue de face complète du véhicule' },
  { type: 'side',   label: 'Côté',       icon: '↔️',  required: false, hint: 'Vue de côté (conducteur)' },
  { type: 'rear',   label: 'Arrière',    icon: '🚙', required: false, hint: 'Vue arrière + plaque arrière' },
  { type: 'damage', label: 'Dégâts',     icon: '⚠️',  required: false, hint: 'Détails dégâts/épave (si applicable)' },
]

export default function PhotosStep() {
  const router = useRouter()
  const { photos, addPhoto, removePhoto, vehicleType } = useDossierDraftStore()
  const [loading, setLoading] = useState<PhotoType | null>(null)

  const getPhoto = (type: PhotoType) => photos.find((p) => p.type === type)
  const requiredCount = SLOTS.filter((s) => s.required).length
  const capturedRequired = SLOTS.filter((s) => s.required && getPhoto(s.type)).length
  const canContinue = capturedRequired >= requiredCount

  const takePhoto = async (slot: PhotoSlot) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la caméra est nécessaire pour photographier le véhicule.")
      return
    }

    setLoading(slot.type)
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
        exif: false,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]

        // Compress to max 1200px wide
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        )

        // Replace existing photo of same type
        const existingIndex = photos.findIndex((p) => p.type === slot.type)
        if (existingIndex !== -1) removePhoto(existingIndex)
        addPhoto({ uri: compressed.uri, type: slot.type })
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de capturer la photo.')
    } finally {
      setLoading(null)
    }
  }

  const pickFromLibrary = async (slot: PhotoSlot) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
    })

    if (!result.canceled && result.assets[0]) {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      )
      const existingIndex = photos.findIndex((p) => p.type === slot.type)
      if (existingIndex !== -1) removePhoto(existingIndex)
      addPhoto({ uri: compressed.uri, type: slot.type })
    }
  }

  const onLongPress = (slot: PhotoSlot) => {
    const existing = getPhoto(slot.type)
    if (!existing) return
    Alert.alert('Options', undefined, [
      { text: 'Reprendre', onPress: () => takePhoto(slot) },
      { text: 'Galerie',   onPress: () => pickFromLibrary(slot) },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => {
          const idx = photos.findIndex((p) => p.type === slot.type)
          if (idx !== -1) removePhoto(idx)
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i <= 1 && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.step}>Étape 2/5 — {capturedRequired}/{requiredCount} obligatoires</Text>

        <Text style={styles.title}>Photos du véhicule</Text>
        <Text style={styles.subtitle}>
          Minimum 2 photos obligatoires. Maintenez appuyé pour les options.
        </Text>

        <View style={styles.grid}>
          {SLOTS.map((slot) => {
            const photo = getPhoto(slot.type)
            const isLoading = loading === slot.type

            return (
              <TouchableOpacity
                key={slot.type}
                style={[
                  styles.slot,
                  photo && styles.slotDone,
                  slot.required && !photo && styles.slotRequired,
                ]}
                onPress={() => photo ? null : takePhoto(slot)}
                onLongPress={() => onLongPress(slot)}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#16a34a" />
                ) : photo ? (
                  <>
                    <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.slotIcon}>{slot.icon}</Text>
                    <Text style={styles.slotLabel}>
                      {slot.label}{slot.required ? ' *' : ''}
                    </Text>
                    <Text style={styles.slotHint}>{slot.hint}</Text>
                    <View style={styles.addBtn}>
                      <Text style={styles.addBtnText}>+ Photo</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {vehicleType === 'epave' && (
          <View style={styles.tip}>
            <Text style={styles.tipText}>
              ⚠️ Pour une épave, photographiez obligatoirement les dégâts visibles. Ces photos seront jointes au dossier OPJ.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={() => canContinue && router.push('/new-dossier/plate')}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            Continuer ({photos.length} photo{photos.length > 1 ? 's' : ''}) →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#16a34a', width: 10, height: 10, borderRadius: 5 },
  step: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slot: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 4,
    padding: 10,
  },
  slotRequired: { borderColor: '#fca5a5' },
  slotDone: { borderColor: '#16a34a', borderStyle: 'solid' },
  slotIcon: { fontSize: 28 },
  slotLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
  slotHint: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
  addBtn: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  addBtnText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  thumbnail: { width: '100%', height: '100%', position: 'absolute' },
  checkBadge: {
    position: 'absolute',
    top: 6, right: 6,
    backgroundColor: '#16a34a',
    borderRadius: 99,
    width: 22, height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tip: {
    marginTop: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },
  tipText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
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
