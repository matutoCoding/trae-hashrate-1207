import { create } from 'zustand';
import type { Maintenance } from '@/types';
import { mockMaintenances } from '@/utils/mock';

interface MaintenanceState {
  maintenances: Maintenance[];
  addMaintenance: (maintenance: Omit<Maintenance, 'id' | 'status' | 'completedDate'>) => void;
  updateMaintenance: (id: string, updates: Partial<Maintenance>) => void;
  completeMaintenance: (id: string) => void;
  cancelMaintenance: (id: string) => void;
  deleteMaintenance: (id: string) => void;
  getMaintenanceById: (id: string) => Maintenance | undefined;
  getMaintenancesByBatch: (batchId: string) => Maintenance[];
  getPendingMaintenances: () => Maintenance[];
  getMaintenancesByDate: (date: string) => Maintenance[];
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  maintenances: mockMaintenances,

  addMaintenance: (maintenance) => {
    const newMaintenance: Maintenance = {
      ...maintenance,
      id: `mt-${Date.now()}`,
      status: 'pending',
      completedDate: null,
    };
    set((state) => ({ maintenances: [...state.maintenances, newMaintenance] }));
  },

  updateMaintenance: (id, updates) => {
    set((state) => ({
      maintenances: state.maintenances.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },

  completeMaintenance: (id) => {
    set((state) => ({
      maintenances: state.maintenances.map((m) =>
        m.id === id
          ? { ...m, status: 'completed', completedDate: new Date().toISOString().split('T')[0] }
          : m
      ),
    }));
  },

  cancelMaintenance: (id) => {
    set((state) => ({
      maintenances: state.maintenances.map((m) =>
        m.id === id ? { ...m, status: 'cancelled' } : m
      ),
    }));
  },

  deleteMaintenance: (id) => {
    set((state) => ({
      maintenances: state.maintenances.filter((m) => m.id !== id),
    }));
  },

  getMaintenanceById: (id) => {
    return get().maintenances.find((m) => m.id === id);
  },

  getMaintenancesByBatch: (batchId) => {
    return get().maintenances.filter((m) => m.batchId === batchId);
  },

  getPendingMaintenances: () => {
    return get().maintenances.filter((m) => m.status === 'pending');
  },

  getMaintenancesByDate: (date) => {
    return get().maintenances.filter((m) => m.scheduledDate === date);
  },
}));
