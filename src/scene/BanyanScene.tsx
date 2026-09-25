import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { events } from '@/shared/lib/events';
import { music } from '@/shared/lib/music';
import { vi } from '@/shared/i18n/vi';
import { toast } from '@/shared/ui/toast';
import { BrandMark, CubeIcon, MusicIcon, MusicOffIcon, PictureIcon, RecenterIcon, RotateLeftIcon, RotateRightIcon, ZoomInIcon, ZoomOutIcon } from '@/shared/ui/icons';
import { useCameraControls, useSceneStore } from './sceneStore';
import type { SceneProps } from './sceneProps';
import { Scene2D } from './Scene2D';
import { useRenderCapability } from './useRenderCapability';

const loadScene3D = () => import('./three/BanyanScene3D');
let Scene3D = lazy(loadScene3D);

function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-night-950 text-amber-100">
      <div className="animate-float">
        <BrandMark size={72} />
      </div>
      <p>{vi.scene.loading}</p>
      <div
        role="progressbar"
        aria-label={vi.scene.loading}
        className="h-1.5 w-48 overflow-hidden rounded-full bg-amber-100/15"
      >
        <div className="h-full w-1/3 rounded-full bg-amber-300 animate-progress" />
      </div>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  onRetry: () => void;
  onUse2d: () => void;
}

/** Lỗi tải cảnh 3D → Thử lại / Dùng 2D (FR-001-11, ERR-001-02). */
class SceneErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    events.emit('scene:error', { reason: 'model-load' });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-night-950 p-6 text-center text-amber-100">
        <p>{vi.scene.loadFailed}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onRetry();
            }}
          >
            {vi.scene.retry}
          </button>
          <button type="button" className="btn-secondary" onClick={this.props.onUse2d}>
            {vi.scene.use2d}
          </button>
        </div>
      </div>
    );
  }
}

const ROTATE_STEP = Math.PI / 12;

export function BanyanScene(props: SceneProps) {
  const { webgl, mode } = useRenderCapability();
  const fallback = useSceneStore((s) => s.fallbackReason);
  const setRenderMode = useSceneStore((s) => s.setRenderMode);
  const cam = useCameraControls();
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!webgl) {
      toast(vi.scene.noWebgl);
      events.emit('scene:error', { reason: 'webgl' });
    }
  }, [webgl]);

  useEffect(() => {
    if (fallback === 'context-lost') toast(vi.scene.contextLost);
  }, [fallback]);

  // Điều khiển bằng bàn phím (FR-001-14)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (mode !== '3d' || e.target !== e.currentTarget) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => cam.rotate(-ROTATE_STEP),
      ArrowRight: () => cam.rotate(ROTATE_STEP),
      '+': () => cam.zoom(0.15),
      '=': () => cam.zoom(0.15),
      '-': () => cam.zoom(-0.15),
      Home: () => cam.reset(),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div
      className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
      tabIndex={mode === '3d' ? 0 : -1}
      aria-label={vi.scene.canvasLabel}
      onKeyDown={onKeyDown}
    >
      {mode === '2d' ? (
        <Scene2D {...props} />
      ) : (
        <SceneErrorBoundary
          key={retryKey}
          onRetry={() => {
            Scene3D = lazy(loadScene3D);
            setRetryKey((k) => k + 1);
          }}
          onUse2d={() => setRenderMode('2d')}
        >
          <Suspense fallback={<LoadingScreen />}>
            <Scene3D {...props} />
          </Suspense>
        </SceneErrorBoundary>
      )}
    </div>
  );
}

/** Nút điều khiển camera, nhạc, chế độ 2D/3D. */
export function SceneControls() {
  const { webgl, mode } = useRenderCapability();
  const cam = useCameraControls();
  const musicEnabled = useSceneStore((s) => s.musicEnabled);
  const volume = useSceneStore((s) => s.musicVolume);
  const setMusic = useSceneStore((s) => s.setMusic);
  const setRenderMode = useSceneStore((s) => s.setRenderMode);

  useEffect(() => {
    if (!musicEnabled) {
      music.stop();
      return;
    }
    void music.start(volume).then((ok) => {
      if (!ok) setMusic(false);
    });
    // Tạm dừng nhạc khi tab ẩn (FR-001-13)
    const onVis = () => {
      if (document.visibilityState === 'hidden') music.pause();
      else void music.start(useSceneStore.getState().musicVolume);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [musicEnabled, volume, setMusic]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {mode === '3d' && (
        <>
          <button type="button" className="btn-icon" aria-label={vi.scene.rotateLeft} title={vi.scene.rotateLeft} onClick={() => cam.rotate(-ROTATE_STEP)}>
            <RotateLeftIcon />
          </button>
          <button type="button" className="btn-icon" aria-label={vi.scene.rotateRight} title={vi.scene.rotateRight} onClick={() => cam.rotate(ROTATE_STEP)}>
            <RotateRightIcon />
          </button>
          <button type="button" className="btn-icon" aria-label={vi.scene.zoomIn} title={vi.scene.zoomIn} onClick={() => cam.zoom(0.15)}>
            <ZoomInIcon />
          </button>
          <button type="button" className="btn-icon" aria-label={vi.scene.zoomOut} title={vi.scene.zoomOut} onClick={() => cam.zoom(-0.15)}>
            <ZoomOutIcon />
          </button>
          <button type="button" className="btn-icon" aria-label={vi.scene.resetView} title={vi.scene.resetView} onClick={cam.reset}>
            <RecenterIcon />
          </button>
        </>
      )}
      <button
        type="button"
        className="btn-icon"
        aria-pressed={musicEnabled}
        aria-label={musicEnabled ? vi.scene.musicOff : vi.scene.musicOn}
        title={musicEnabled ? vi.scene.musicOff : vi.scene.musicOn}
        onClick={() => setMusic(!musicEnabled)}
      >
        {musicEnabled ? <MusicIcon /> : <MusicOffIcon />}
      </button>
      {webgl && (
        <button
          type="button"
          className="btn-icon gap-1.5 px-3 text-xs"
          onClick={() => setRenderMode(mode === '3d' ? '2d' : '3d')}
        >
          {mode === '3d' ? <PictureIcon size={18} /> : <CubeIcon size={18} />}
          {mode === '3d' ? vi.scene.mode2d : vi.scene.mode3d}
        </button>
      )}
    </div>
  );
}
