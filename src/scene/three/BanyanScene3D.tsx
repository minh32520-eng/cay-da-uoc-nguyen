import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { events } from '@/shared/lib/events';
import { vi } from '@/shared/i18n/vi';
import { useSceneStore } from '../sceneStore';
import type { SceneProps } from '../sceneProps';
import { CameraRig, DEFAULT_CAMERA } from './CameraRig';
import { GarlandLights, Ground, Ornaments, Sky, Snowfall, TreeStar } from './Environment';
import { Reindeer } from './Reindeer';
import { Snowmen } from './Snowmen';
import { SlotMarkers } from './SlotMarkers';
import { Tree } from './Tree';
import { WishPapers } from './WishPapers';

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

/** Cảnh 3D — được lazy-load để giữ bundle ban đầu nhỏ (NFR-001-03). */
export default function BanyanScene3D(props: SceneProps) {
  const visible = usePageVisible();
  const lowQuality = useSceneStore((s) => s.lowQuality);
  const setLowQuality = useSceneStore((s) => s.setLowQuality);
  const setFallback = useSceneStore((s) => s.setFallback);

  return (
    <Canvas
      role="img"
      aria-label={vi.scene.canvasLabel}
      // Tạm dừng render khi tab ẩn (FR-001-13)
      frameloop={visible ? 'always' : 'never'}
      dpr={lowQuality ? 1 : [1, 2]}
      camera={{ position: DEFAULT_CAMERA.toArray(), fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: !lowQuality, powerPreference: 'high-performance' }}
      onPointerMissed={() => props.onBackgroundClick?.()}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        let restoreTimer: number | undefined;
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          // Chờ khôi phục một lần; thất bại → chuyển 2D (ERR-001-03)
          restoreTimer = window.setTimeout(() => setFallback('context-lost'), 3000);
        });
        canvas.addEventListener('webglcontextrestored', () => window.clearTimeout(restoreTimer));
        events.emit('scene:ready', { mode: '3d' });
      }}
    >
      {/* FPS thấp kéo dài → giảm chất lượng (ERR-001-05) */}
      <PerformanceMonitor bounds={() => [24, 60]} onDecline={() => setLowQuality(true)} />
      <Sky animate={!props.reducedMotion} />
      <Ground />
      <Tree animate={!props.reducedMotion} />
      <Ornaments animate={!props.reducedMotion} />
      <GarlandLights animate={!props.reducedMotion} />
      <TreeStar animate={!props.reducedMotion} />
      <Reindeer animate={!props.reducedMotion} />
      <Snowmen animate={!props.reducedMotion} />
      <Snowfall animate={!props.reducedMotion} lowQuality={lowQuality} />
      <WishPapers
        wishes={props.wishes}
        reducedMotion={props.reducedMotion}
        highlightIds={props.highlightIds}
        selectedId={props.selectedId}
        onWishClick={props.onWishClick}
      />
      {props.pickableSlots && props.onSlotClick && (
        <SlotMarkers slots={props.pickableSlots} animate={!props.reducedMotion} onPick={props.onSlotClick} />
      )}
      <CameraRig reducedMotion={props.reducedMotion} />
    </Canvas>
  );
}
