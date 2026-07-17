'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  activeChat: string | null;
  setActiveChat: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      activeChat: null,
      setActiveChat: (id) => set({ activeChat: id }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'netma-store' },
  ),
);
