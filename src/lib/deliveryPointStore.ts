import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DeliveryPoint } from '@/types';

interface DeliveryPointState {
  selectedPointId: string | null;
  setSelectedPointId: (id: string) => void;
  getActivePoint: (points: DeliveryPoint[]) => DeliveryPoint | undefined;
}

export const useDeliveryPointStore = create<DeliveryPointState>()(
  persist(
    (set, get) => ({
      selectedPointId: null,
      setSelectedPointId: (id: string) => set({ selectedPointId: id }),
      getActivePoint: (points: DeliveryPoint[]) => {
        const { selectedPointId } = get();
        if (selectedPointId) {
          const match = points.find((p) => p.id === selectedPointId);
          if (match) return match;
        }
        return points[0];
      },
    }),
    {
      name: 'plinkit-delivery-point',
    }
  )
);
