import { create } from 'zustand';
import { z } from 'zod';
import { STORAGE_KEYS } from '@/entities/wish/constants';
import { readJson, writeRaw } from '@/shared/lib/storage';
import type { SceneSettings } from './types';

const SettingsSchema = z.object({
  musicEnabled: z.boolean(),
  musicVolume: z.number().min(0).max(1),
  renderMode: z.enum(['auto', '3d', '2d']),
});

const DEFAULTS: SceneSettings = { musicEnabled: false, musicVolume: 0.3, renderMode: 'auto' };

function loadSettings(): SceneSettings {
  const parsed = SettingsSchema.safeParse(readJson(STORAGE_KEYS.settings));
  // Nhạc luôn tắt khi mở trang: trình duyệt chặn autoplay (ERR-001-04)
  return parsed.success ? { ...parsed.data, musicEnabled: false } : DEFAULTS;
}

export type CameraCommand =
  | { type: 'reset' }
  | { type: 'rotate'; delta: number }
  | { type: 'zoom'; delta: number }
  | { type: 'flyTo'; slotId: string; durationMs: number };

interface SceneState extends SceneSettings {
  /** Lỗi khiến phải chuyển 2D: không có WebGL / mất context / tải lỗi. */
  fallbackReason: 'webgl' | 'context-lost' | 'model-load' | null;
  command: (CameraCommand & { seq: number }) | null;
  lowQuality: boolean;
  setMusic(enabled: boolean): void;
  setVolume(v: number): void;
  setRenderMode(m: SceneSettings['renderMode']): void;
  setFallback(reason: SceneState['fallbackReason']): void;
  setLowQuality(v: boolean): void;
  send(cmd: CameraCommand): void;
}

let cmdSeq = 0;

export const useSceneStore = create<SceneState>()((set, get) => {
  const persist = () => {
    const { musicEnabled, musicVolume, renderMode } = get();
    try {
      writeRaw(STORAGE_KEYS.settings, JSON.stringify({ musicEnabled, musicVolume, renderMode }));
    } catch {
      /* cài đặt không lưu được thì chỉ giữ trong phiên */
    }
  };
  return {
    ...loadSettings(),
    fallbackReason: null,
    command: null,
    lowQuality: false,
    setMusic(enabled) {
      set({ musicEnabled: enabled });
      persist();
    },
    setVolume(v) {
      set({ musicVolume: Math.min(1, Math.max(0, v)) });
      persist();
    },
    setRenderMode(m) {
      set({ renderMode: m, fallbackReason: m === '3d' ? null : get().fallbackReason });
      persist();
    },
    setFallback(reason) {
      set({ fallbackReason: reason });
    },
    setLowQuality(v) {
      set({ lowQuality: v });
    },
    send(cmd) {
      set({ command: { ...cmd, seq: ++cmdSeq } });
    },
  };
});

/** API điều khiển camera cho các feature khác (001 §6). */
export function useCameraControls() {
  const send = useSceneStore((s) => s.send);
  return {
    reset: () => send({ type: 'reset' }),
    rotate: (delta: number) => send({ type: 'rotate', delta }),
    zoom: (delta: number) => send({ type: 'zoom', delta }),
    flyTo: (slotId: string, durationMs = 900) => send({ type: 'flyTo', slotId, durationMs }),
  };
}

export const cameraControls = {
  flyTo: (slotId: string, durationMs = 900) =>
    useSceneStore.getState().send({ type: 'flyTo', slotId, durationMs }),
  reset: () => useSceneStore.getState().send({ type: 'reset' }),
};
