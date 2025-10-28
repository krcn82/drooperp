'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initializeFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

type CashDrawerState = {
  id: string | null; // ID of the current cash register document
  isOpen: boolean;
  isDialogOpen: boolean;
  openDrawerDialog: () => void;
  closeDrawerDialog: () => void;
  openNewSession: (openingBalance: number, cashierId: string, cashierName: string) => Promise<void>;
  closeCurrentSession: () => void;
};

const useCashDrawerStore = create<CashDrawerState>()(
  persist(
    (set, get) => ({
      id: null,
      isOpen: false,
      isDialogOpen: false,
      openDrawerDialog: () => set({ isDialogOpen: true }),
      closeDrawerDialog: () => set({ isDialogOpen: false }),
      openNewSession: async (openingBalance, cashierId, cashierName) => {
        const { firestore } = initializeFirebase();
        const tenantId = localStorage.getItem('tenantId');
        if (!tenantId) {
          console.error("No tenant ID found");
          return;
        }

        const newSession = {
          tenantId,
          cashierId,
          cashierName,
          openingBalance,
          status: 'open' as const,
          openedAt: serverTimestamp(),
          closedAt: null,
          totalSales: 0,
          totalCashSales: 0,
        };

        const cashRegistersRef = collection(firestore, `tenants/${tenantId}/cashRegisters`);
        const docRef = await addDocumentNonBlocking(cashRegistersRef, newSession);
        
        set({ id: docRef.id, isOpen: true });
      },
      closeCurrentSession: () => {
        set({ id: null, isOpen: false });
      },
    }),
    {
      name: 'cash-drawer-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);

export const useCashDrawer = useCashDrawerStore;

import { ReactNode } from 'react';

export const CashDrawerProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
