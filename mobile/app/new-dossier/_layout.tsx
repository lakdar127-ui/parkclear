import { Stack } from 'expo-router'

const STEPS = ['type', 'photos', 'plate', 'location', 'confirm']

export default function NewDossierLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: '#16a34a',
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600', color: '#111827' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#f9fafb' },
      }}
    >
      <Stack.Screen name="type"     options={{ title: 'Type de véhicule',  headerBackTitle: 'Retour' }} />
      <Stack.Screen name="photos"   options={{ title: 'Photos du véhicule', headerBackTitle: 'Retour' }} />
      <Stack.Screen name="plate"    options={{ title: 'Plaque',             headerBackTitle: 'Retour' }} />
      <Stack.Screen name="location" options={{ title: 'Localisation',       headerBackTitle: 'Retour' }} />
      <Stack.Screen name="confirm"  options={{ title: 'Confirmer',          headerBackTitle: 'Retour' }} />
    </Stack>
  )
}
