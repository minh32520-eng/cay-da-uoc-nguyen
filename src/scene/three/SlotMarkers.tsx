import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { BranchSlot } from '../types';
import { PAPER_HANG_LENGTH } from '../treeLayout';

interface SlotMarkersProps {
  slots: BranchSlot[];
  animate: boolean;
  onPick: (slotId: string) => void;
}

/** Đốm sáng tại các slot trống khi bật "Tự chọn cành" (FR-003-04). */
export function SlotMarkers({ slots, animate, onPick }: SlotMarkersProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), []);

  const write = (scale: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    slots.forEach((slot, i) => {
      tmp.p.set(slot.position[0], slot.position[1] - PAPER_HANG_LENGTH, slot.position[2]);
      tmp.s.setScalar(scale);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    });
    mesh.count = slots.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingSphere = null;
  };

  useLayoutEffect(() => write(1));
  useFrame(({ clock }) => {
    if (animate) write(1 + Math.sin(clock.getElapsedTime() * 4) * 0.2);
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(1, slots.length)]}
      frustumCulled={false}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const slot = e.instanceId !== undefined ? slots[e.instanceId] : undefined;
        if (slot) onPick(slot.id);
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshBasicMaterial color="#fde68a" toneMapped={false} transparent opacity={0.9} />
    </instancedMesh>
  );
}
