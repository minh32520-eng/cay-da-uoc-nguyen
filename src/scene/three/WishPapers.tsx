import { useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PAPER_HEX, useWishStore, type Wish } from '@/entities/wish';
import { getSlotById } from '../branchSlots';
import { PAPER_HANG_LENGTH, PAPER_HEIGHT, PAPER_WIDTH } from '../treeLayout';
import type { Vec3 } from '../types';
import { paperTexture } from './textures';

const CAPACITY = 128;
const PAPER_W = PAPER_WIDTH;
const PAPER_H = PAPER_HEIGHT;

interface WishPapersProps {
  wishes: Wish[];
  reducedMotion: boolean;
  /** null = không lọc; Set = chỉ các id này sáng rõ (FR-004-09). */
  highlightIds: Set<string> | null;
  selectedId: string | null;
  onWishClick?: (id: string) => void;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function bezier(a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [0, 1, 2].map((i) => u * u * a[i]! + 2 * u * t * c[i]! + t * t * b[i]!) as Vec3;
}

/**
 * Toàn bộ tờ giấy dùng InstancedMesh: 1 draw call cho giấy, 1 cho dây (NFR-003-01).
 * Pivot hình học đặt ở điểm buộc dây để đung đưa quanh cành.
 */
export function WishPapers({ wishes, reducedMotion, highlightIds, selectedId, onWishClick }: WishPapersProps) {
  const paperRef = useRef<THREE.InstancedMesh>(null);
  const stringRef = useRef<THREE.InstancedMesh>(null);
  const hitRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const falling = useWishStore((s) => s.falling);
  const animation = useWishStore((s) => s.animation);

  const items = useMemo(
    () => [
      ...wishes.map((w) => ({ wish: w, fallingSince: null as number | null })),
      ...falling.map((f) => ({ wish: f.wish, fallingSince: f.startedAt })),
    ],
    [wishes, falling],
  );

  // Pha đung đưa ngẫu nhiên nhưng ổn định theo id
  const phases = useMemo(() => {
    const map = new Map<string, number>();
    for (const { wish } of items) {
      let h = 0;
      for (const ch of wish.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
      map.set(wish.id, (Math.abs(h) % 1000) / 1000);
    }
    return map;
  }, [items]);

  const geometries = useMemo(() => {
    const paper = new THREE.PlaneGeometry(PAPER_W, PAPER_H);
    paper.translate(0, -PAPER_HANG_LENGTH - PAPER_H / 2, 0);
    const hit = new THREE.PlaneGeometry(0.5, 0.66);
    hit.translate(0, -PAPER_HANG_LENGTH - PAPER_H / 2, 0);
    const string = new THREE.BoxGeometry(0.008, PAPER_HANG_LENGTH, 0.008);
    string.translate(0, -PAPER_HANG_LENGTH / 2, 0);
    return { paper, hit, string };
  }, []);

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      c: new THREE.Color(),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const paper = paperRef.current;
    const string = stringRef.current;
    const hit = hitRef.current;
    if (!paper || !string || !hit) return;
    const t = clock.getElapsedTime();
    const nowMs = performance.now();
    const { m, q, e, p, s, c } = tmp;
    let n = 0;

    for (const { wish, fallingSince } of items) {
      const slot = getSlotById(wish.slotId);
      if (!slot || n >= CAPACITY) continue;
      const phase = phases.get(wish.id) ?? 0;
      let pos: Vec3 = slot.position;
      let scale = 1;
      let spin = 0;
      let showString = true;
      const sway = reducedMotion ? 0 : Math.sin(t * 1.4 + phase * Math.PI * 2) * 0.08; // ≤ 5°

      if (animation?.wishId === wish.id) {
        const k = Math.min(1, (nowMs - animation.startedAt) / animation.durationMs);
        if (reducedMotion) {
          scale = k; // hiện dần tại slot (FR-003-13)
        } else if (k < 1) {
          const [x, , z] = slot.position;
          const start: Vec3 = [x * 0.25, 0.4, z * 0.25];
          const ctrl: Vec3 = [x * 0.6, slot.position[1] + 2.2, z * 0.6];
          pos = bezier(start, ctrl, slot.position, easeInOut(k));
          spin = (1 - k) * Math.PI * 4;
          showString = k > 0.9;
        }
      } else if (fallingSince !== null) {
        const k = Math.min(1, (nowMs - fallingSince) / 1000);
        pos = [slot.position[0], slot.position[1] - k * k * slot.position[1], slot.position[2]];
        spin = k * Math.PI * 3;
        scale = 1 - k * 0.6;
        showString = false;
      }

      if (wish.id === selectedId) scale *= 1.3;
      else if (hovered === n) scale *= 1.2;

      e.set(spin * 0.3, slot.rotationY + spin, sway);
      q.setFromEuler(e);
      p.set(pos[0], pos[1], pos[2]);
      s.set(scale, scale, scale);
      m.compose(p, q, s);
      paper.setMatrixAt(n, m);
      hit.setMatrixAt(n, m);
      if (!showString) s.set(0, 0, 0);
      m.compose(p, q, s);
      string.setMatrixAt(n, m);

      const dim = highlightIds !== null && !highlightIds.has(wish.id);
      const selectDim = selectedId !== null && wish.id !== selectedId;
      c.set(PAPER_HEX[wish.paperColor]).multiplyScalar(dim ? 0.25 : selectDim ? 0.5 : 1);
      paper.setColorAt(n, c);
      n++;
    }

    paper.count = n;
    string.count = n;
    hit.count = n;
    paper.instanceMatrix.needsUpdate = true;
    string.instanceMatrix.needsUpdate = true;
    hit.instanceMatrix.needsUpdate = true;
    if (paper.instanceColor) paper.instanceColor.needsUpdate = true;
    // Ma trận đổi mỗi khung hình → buộc tính lại bounding sphere để raycast (click) trúng
    hit.boundingSphere = null;
    hit.boundingBox = null;
  });

  const idAt = (i: number | undefined) => (i === undefined ? undefined : items[i]);

  const hoveredItem = hovered !== null ? idAt(hovered) : undefined;
  const hoveredSlot = hoveredItem ? getSlotById(hoveredItem.wish.slotId) : undefined;

  return (
    <group>
      <instancedMesh ref={paperRef} args={[geometries.paper, undefined, CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial map={paperTexture()} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stringRef} args={[geometries.string, undefined, CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial color="#b91c1c" />
      </instancedMesh>
      {/* Vùng chạm vô hình lớn hơn tờ giấy (NFR-004-05) */}
      <instancedMesh
        ref={hitRef}
        args={[geometries.hit, undefined, CAPACITY]}
        frustumCulled={false}
        onPointerMove={(ev: ThreeEvent<PointerEvent>) => {
          ev.stopPropagation();
          if (ev.instanceId !== hovered && idAt(ev.instanceId)?.fallingSince === null) {
            setHovered(ev.instanceId ?? null);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = '';
        }}
        onClick={(ev: ThreeEvent<MouseEvent>) => {
          ev.stopPropagation();
          const item = idAt(ev.instanceId);
          if (item && item.fallingSince === null) onWishClick?.(item.wish.id);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </instancedMesh>
      {hoveredItem && hoveredSlot && (
        <Html
          position={[hoveredSlot.position[0], hoveredSlot.position[1] + 0.15, hoveredSlot.position[2]]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="whitespace-nowrap rounded-md bg-night-900/90 px-2 py-1 text-xs text-amber-100 shadow">
            {hoveredItem.wish.author}
          </div>
        </Html>
      )}
    </group>
  );
}
