import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
  durationMs: number;
}

interface ToastState {
  toasts: Toast[];
  push(t: Omit<Toast, 'id' | 'durationMs' | 'tone'> & Partial<Pick<Toast, 'durationMs' | 'tone'>>): number;
  dismiss(id: number): void;
}

let seq = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push(t) {
    const id = ++seq;
    const toast: Toast = { tone: 'info', durationMs: 4000, ...t, id };
    set({ toasts: [...get().toasts, toast] });
    setTimeout(() => get().dismiss(id), toast.durationMs);
    return id;
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const toast = (message: string, opts: Partial<Omit<Toast, 'id' | 'message'>> = {}) =>
  useToastStore.getState().push({ message, ...opts });
