'use client';
import { create } from 'zustand';
import type { Suggestion } from '@/app/dashboard/actions';
import { ReactNode } from 'react';

type AiState = {
  isChatOpen: boolean;
  setChatOpen: (isOpen: boolean) => void;
  prefilledMessage: string | null;
  setPrefilledMessage: (message: string) => void;
  clearPrefilledMessage: () => void;
  suggestion: Suggestion | null;
  setSuggestion: (suggestion: Suggestion) => void;
  clearSuggestion: () => void;
};

const useAiStateStore = create<AiState>((set) => ({
  isChatOpen: false,
  setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
  prefilledMessage: null,
  setPrefilledMessage: (message) => set({ prefilledMessage: message }),
  clearPrefilledMessage: () => set({ prefilledMessage: null }),
  suggestion: null,
  setSuggestion: (suggestion) => set({ suggestion }),
  clearSuggestion: () => set({ suggestion: null }),
}));

// Export the hook
export const useAiState = useAiStateStore;

// Create a provider component
export const AiStateProvider = ({ children }: { children: ReactNode }) => {
  // The store is created above, so the provider just needs to render children.
  // This setup is useful if you need to initialize the store with props in the future.
  return <>{children}</>;
};
