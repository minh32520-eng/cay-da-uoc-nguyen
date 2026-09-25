import type { Wish, WishDraft } from '@/entities/wish/types';
import type { HangError, ImportMode } from '@/entities/wish/types';

/** Bản đồ sự kiện giữa các feature (AGENTS.md §8). */
export interface AppEvents {
  'scene:ready': { mode: '3d' | '2d' };
  'scene:error': { reason: 'webgl' | 'model-load' };
  'wish:submitted': { draft: WishDraft };
  'wish:hung': { wish: Wish };
  'wish:hang-failed': { error: HangError };
  'wish:selected': { wishId: string };
  'wish:deselected': Record<string, never>;
  'wish:updated': { wish: Wish };
  'wish:removed': { wishId: string };
  'wish:restored': { wish: Wish };
  'wishes:imported': { added: number; mode: ImportMode };
  'wishes:cleared': Record<string, never>;
  'share:created': { method: 'native' | 'clipboard' };
  'share:opened': Record<string, never>;
  'share:accepted': { wish: Wish };
}

type Handler<T> = (payload: T) => void;
const handlers = new Map<keyof AppEvents, Set<Handler<never>>>();

export const events = {
  on<K extends keyof AppEvents>(name: K, fn: Handler<AppEvents[K]>): () => void {
    let set = handlers.get(name);
    if (!set) handlers.set(name, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  },
  emit<K extends keyof AppEvents>(name: K, payload: AppEvents[K]): void {
    handlers.get(name)?.forEach((fn) => (fn as Handler<AppEvents[K]>)(payload));
  },
};
