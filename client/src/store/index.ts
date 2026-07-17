'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  activeChat: string | null;
  setActiveChat: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  chatModes: Record<string, 'plan' | 'build'>;
  setChatMode: (employeeId: string, mode: 'plan' | 'build') => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      activeChat: null,
      setActiveChat: (id) => set({ activeChat: id }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      chatModes: {},
      setChatMode: (employeeId, mode) => set((s) => ({ chatModes: { ...s.chatModes, [employeeId]: mode } })),
    }),
    { name: 'netma-store' },
  ),
);
