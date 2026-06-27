import { create } from 'zustand'

export type VehicleType = 'va' | 'epave' | 'unknown'
export type PhotoType = 'plate' | 'front' | 'side' | 'rear' | 'damage' | 'general'

export interface DraftPhoto {
  uri: string
  type: PhotoType
}

export interface DossierDraft {
  vehicleType: VehicleType
  photos: DraftPhoto[]
  plate: string
  noPlate: boolean
  siteId: string
  locationSpot: string
  vehicleBrand: string
  vehicleColor: string
  notes: string
}

interface DossierDraftState extends DossierDraft {
  setVehicleType: (type: VehicleType) => void
  addPhoto: (photo: DraftPhoto) => void
  removePhoto: (index: number) => void
  setPlate: (plate: string) => void
  setNoPlate: (noPlate: boolean) => void
  setSiteId: (id: string) => void
  setLocationSpot: (spot: string) => void
  setVehicleBrand: (brand: string) => void
  setVehicleColor: (color: string) => void
  setNotes: (notes: string) => void
  reset: () => void
}

const INITIAL: DossierDraft = {
  vehicleType: 'unknown',
  photos: [],
  plate: '',
  noPlate: false,
  siteId: '',
  locationSpot: '',
  vehicleBrand: '',
  vehicleColor: '',
  notes: '',
}

export const useDossierDraftStore = create<DossierDraftState>((set) => ({
  ...INITIAL,
  setVehicleType:  (vehicleType)  => set({ vehicleType }),
  addPhoto:        (photo)        => set((s) => ({ photos: [...s.photos, photo] })),
  removePhoto:     (index)        => set((s) => ({ photos: s.photos.filter((_, i) => i !== index) })),
  setPlate:        (plate)        => set({ plate }),
  setNoPlate:      (noPlate)      => set({ noPlate }),
  setSiteId:       (siteId)       => set({ siteId }),
  setLocationSpot: (locationSpot) => set({ locationSpot }),
  setVehicleBrand: (vehicleBrand) => set({ vehicleBrand }),
  setVehicleColor: (vehicleColor) => set({ vehicleColor }),
  setNotes:        (notes)        => set({ notes }),
  reset:           ()             => set(INITIAL),
}))
