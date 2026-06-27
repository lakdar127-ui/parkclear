import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { useDossierDraftStore, VehicleType } from '../../stores/dossierDraftStore'

interface TypeOption {
  type: VehicleType
  icon: string
  title: string
  subtitle: string
  color: string
  bg: string
}

const OPTIONS: TypeOption[] = [
  {
    type: 'va',
    icon: '🚗',
    title: 'Véhicule abandonné (VA)',
    subtitle: 'Véhicule intact mais sans mouvement depuis longtemps. Plaque lisible.',
    color: '#1e40af',
    bg: '#dbeafe',
  },
  {
    type: 'epave',
    icon: '🔧',
    title: 'Épave',
    subtitle: 'Véhicule endommagé, sans roues, brûlé ou dangereux. Procédure accélérée.',
    color: '#b91c1c',
    bg: '#fee2e2',
  },
]

export default function TypeStep() {
  const router = useRouter()
  const { vehicleType, setVehicleType, reset } = useDossierDraftStore()

  const handleSelect = (type: VehicleType) => {
    reset()
    setVehicleType(type)
    router.push('/new-dossier/photos')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.line} />
          <View style={styles.dot} />
          <View style={styles.line} />
          <View style={styles.dot} />
          <View style={styles.line} />
          <View style={styles.dot} />
          <View style={styles.line} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.step}>Étape 1/5</Text>

        <Text style={styles.title}>Quel type de véhicule ?</Text>
        <Text style={styles.subtitle}>
          Le type détermine la procédure légale applicable.
        </Text>

        <View style={styles.options}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={[styles.card, vehicleType === opt.type && styles.cardSelected]}
              onPress={() => handleSelect(opt.type)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: opt.bg }]}>
                <Text style={styles.icon}>{opt.icon}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{opt.title}</Text>
                <Text style={styles.cardSub}>{opt.subtitle}</Text>
              </View>
              <Text style={[styles.chevron, vehicleType === opt.type && { color: '#16a34a' }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            💡 En cas de doute, choisissez "Véhicule abandonné". Vous pourrez requalifier plus tard.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 20 },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#d1d5db',
  },
  dotActive: { backgroundColor: '#16a34a', width: 12, height: 12, borderRadius: 6 },
  line: { flex: 1, height: 2, backgroundColor: '#e5e7eb' },
  step: { fontSize: 12, color: '#9ca3af', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 20 },
  options: { gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: { borderColor: '#16a34a' },
  iconBox: {
    width: 52, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  chevron: { fontSize: 24, color: '#d1d5db' },
  info: {
    marginTop: 'auto',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
  },
  infoText: { fontSize: 13, color: '#166534', lineHeight: 18 },
})
