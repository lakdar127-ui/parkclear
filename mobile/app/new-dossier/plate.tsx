import { useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDossierDraftStore } from '../../stores/dossierDraftStore'

// French plate: AB-123-CD or old format 1234-AB-75
const plateRegex = /^[A-Z]{2}-\d{3}-[A-Z]{2}$|^\d{1,4}-[A-Z]{1,3}-\d{2,3}$/

const schema = z.object({
  plate:        z.string().regex(plateRegex, 'Format invalide — ex : AB-123-CD').optional().or(z.literal('')),
  noPlate:      z.boolean(),
  vehicleBrand: z.string().max(50).optional(),
  vehicleColor: z.string().max(30).optional(),
}).refine((v) => v.noPlate || (v.plate && v.plate.length > 0), {
  message: 'Saisissez la plaque ou cochez "sans plaque lisible"',
  path: ['plate'],
})

type FormValues = z.infer<typeof schema>

const COLORS = ['Blanc', 'Noir', 'Gris', 'Rouge', 'Bleu', 'Vert', 'Jaune', 'Orange']

export default function PlateStep() {
  const router = useRouter()
  const { plate, noPlate, vehicleBrand, vehicleColor, setPlate, setNoPlate, setVehicleBrand, setVehicleColor } = useDossierDraftStore()

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      plate: plate,
      noPlate: noPlate,
      vehicleBrand: vehicleBrand,
      vehicleColor: vehicleColor,
    },
  })

  const isNoPlate = watch('noPlate')

  const onSubmit = (values: FormValues) => {
    setPlate(values.plate?.toUpperCase() ?? '')
    setNoPlate(values.noPlate)
    setVehicleBrand(values.vehicleBrand ?? '')
    setVehicleColor(values.vehicleColor ?? '')
    router.push('/new-dossier/location')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Progress */}
          <View style={styles.progress}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.dot, i <= 2 && styles.dotActive]} />
            ))}
          </View>
          <Text style={styles.step}>Étape 3/5</Text>

          <Text style={styles.title}>Identification</Text>
          <Text style={styles.subtitle}>Numéro de plaque et informations du véhicule.</Text>

          {/* Plaque */}
          <View style={styles.field}>
            <Text style={styles.label}>Plaque d'immatriculation *</Text>
            <Controller
              control={control}
              name="plate"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.plateInput, (isNoPlate || errors.plate) && styles.inputError, isNoPlate && styles.inputDisabled]}
                  placeholder="AB-123-CD"
                  placeholderTextColor="#9ca3af"
                  value={value}
                  onChangeText={(t) => onChange(t.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  autoCapitalize="characters"
                  maxLength={9}
                  editable={!isNoPlate}
                  keyboardType="default"
                />
              )}
            />
            {errors.plate && !isNoPlate && (
              <Text style={styles.error}>{errors.plate.message}</Text>
            )}
          </View>

          {/* No plate toggle */}
          <Controller
            control={control}
            name="noPlate"
            render={({ field: { onChange, value } }) => (
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Plaque illisible / absente</Text>
                  <Text style={styles.toggleSub}>Cochez si aucune plaque visible</Text>
                </View>
                <Switch
                  value={value}
                  onValueChange={(v) => {
                    onChange(v)
                    if (v) setValue('plate', '')
                  }}
                  trackColor={{ true: '#16a34a', false: '#d1d5db' }}
                  thumbColor="#fff"
                />
              </View>
            )}
          />

          {/* Marque */}
          <View style={styles.field}>
            <Text style={styles.label}>Marque (optionnel)</Text>
            <Controller
              control={control}
              name="vehicleBrand"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Renault, Peugeot, BMW…"
                  placeholderTextColor="#9ca3af"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                />
              )}
            />
          </View>

          {/* Couleur */}
          <View style={styles.field}>
            <Text style={styles.label}>Couleur (optionnel)</Text>
            <Controller
              control={control}
              name="vehicleColor"
              render={({ field: { onChange, value } }) => (
                <>
                  <View style={styles.colorRow}>
                    {COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.colorChip, value === c && styles.colorChipSelected]}
                        onPress={() => onChange(value === c ? '' : c)}
                      >
                        <Text style={[styles.colorChipText, value === c && styles.colorChipTextSelected]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Autre couleur…"
                    placeholderTextColor="#9ca3af"
                    value={COLORS.includes(value ?? '') ? '' : (value ?? '')}
                    onChangeText={onChange}
                    autoCapitalize="words"
                  />
                </>
              )}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.btn}
            onPress={handleSubmit(onSubmit)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Continuer →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  kav: { flex: 1 },
  container: { flex: 1, padding: 20 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#16a34a' },
  step: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  plateInput: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
  },
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
  inputError: { borderColor: '#dc2626' },
  inputDisabled: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  toggleSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  colorChipSelected: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  colorChipText: { fontSize: 13, color: '#374151' },
  colorChipTextSelected: { color: '#fff', fontWeight: '600' },
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
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
