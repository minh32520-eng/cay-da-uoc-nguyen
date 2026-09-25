import { useMemo } from 'react';
import { useSceneStore } from './sceneStore';

let cachedWebgl: boolean | null = null;

export function detectWebgl(): boolean {
  if (cachedWebgl !== null) return cachedWebgl;
  try {
    const canvas = document.createElement('canvas');
    cachedWebgl = !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    cachedWebgl = false;
  }
  return cachedWebgl;
}

/** Quyết định dựng 3D hay 2D (FR-001-10, ERR-001-01/03). */
export function useRenderCapability(): { webgl: boolean; mode: '3d' | '2d' } {
  const renderMode = useSceneStore((s) => s.renderMode);
  const fallback = useSceneStore((s) => s.fallbackReason);
  const webgl = useMemo(detectWebgl, []);
  const mode = !webgl || renderMode === '2d' || (renderMode === 'auto' && fallback) ? '2d' : '3d';
  return { webgl, mode };
}
