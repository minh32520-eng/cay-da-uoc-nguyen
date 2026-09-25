import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { getSlotById } from '../branchSlots';
import { useSceneStore } from '../sceneStore';
import { PAPER_HANG_LENGTH } from '../treeLayout';
import { RABBIT_HERD } from './Rabbits';

const RABBIT_CAM = import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('rabbitcam');

export const DEFAULT_CAMERA = new THREE.Vector3(0, 5.2, 13);
export const DEFAULT_TARGET = new THREE.Vector3(0, 3.2, 0);
export const MIN_DISTANCE = 4;
export const MAX_DISTANCE = 20;
const DEG = Math.PI / 180;
const IDLE_MS = 10_000;
const AUTO_ROTATE_RAD_PER_S = 5 * DEG; // FR-001-08

interface Tween {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  start: number;
  duration: number;
}

const ease = (t: number) => 1 - (1 - t) ** 3;

/** Điều khiển camera: giới hạn góc & khoảng cách, tự xoay khi rảnh, lệnh reset/flyTo (FR-001-04..08). */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  // Màn hình dọc (điện thoại) cần lùi camera để thấy trọn tán cây
  const defaultPos = useMemo(() => {
    const d = aspect < 1 ? THREE.MathUtils.clamp(13 / aspect ** 0.7, 13, MAX_DISTANCE - 1) : 13;
    return DEFAULT_TARGET.clone().add(DEFAULT_CAMERA.clone().sub(DEFAULT_TARGET).setLength(d));
  }, [aspect]);

  useEffect(() => {
    camera.position.copy(defaultPos);
    controls.current?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đặt lúc khởi tạo
  }, []);
  const lastInteraction = useRef(performance.now());
  const tween = useRef<Tween | null>(null);
  const command = useSceneStore((s) => s.command);

  const startTween = (toPos: THREE.Vector3, toTarget: THREE.Vector3, duration: number) => {
    const c = controls.current;
    if (!c) return;
    if (reducedMotion || duration <= 0) {
      camera.position.copy(toPos);
      c.target.copy(toTarget);
      c.update();
      return;
    }
    tween.current = {
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: c.target.clone(),
      toTarget,
      start: performance.now(),
      duration,
    };
  };

  useEffect(() => {
    const c = controls.current;
    if (!command || !c) return;
    lastInteraction.current = performance.now();
    const offset = camera.position.clone().sub(c.target);
    switch (command.type) {
      case 'reset':
        startTween(defaultPos.clone(), DEFAULT_TARGET.clone(), 600);
        break;
      case 'rotate':
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), command.delta);
        startTween(c.target.clone().add(offset), c.target.clone(), 250);
        break;
      case 'zoom': {
        const len = THREE.MathUtils.clamp(offset.length() * (1 - command.delta), MIN_DISTANCE, MAX_DISTANCE);
        startTween(c.target.clone().add(offset.setLength(len)), c.target.clone(), 250);
        break;
      }
      case 'flyTo': {
        const slot = getSlotById(command.slotId);
        if (!slot) break;
        const [x, y, z] = slot.position;
        const target = new THREE.Vector3(x, y - PAPER_HANG_LENGTH - 0.15, z);
        const out = new THREE.Vector3(x, 0, z).normalize();
        if (out.lengthSq() === 0) out.set(0, 0, 1);
        // Lùi ra ngoài tán lá để không bị cành che
        const pos = target.clone().add(out.multiplyScalar(6.5)).add(new THREE.Vector3(0, 1.4, 0));
        startTween(pos, target, command.durationMs);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi có lệnh mới
  }, [command?.seq]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    // Chỉ khi dev: ?rabbitcam bám theo một con thỏ để soi model
    if (RABBIT_CAM) {
      const r = RABBIT_HERD[Number(new URLSearchParams(location.search).get('rabbitcam')) || 0];
      if (r) {
        c.target.set(r.x, 0.22, r.z);
        camera.position.set(r.x + Math.sin(r.heading + 1.2) * 1.1, 0.45, r.z + Math.cos(r.heading + 1.2) * 1.1);
        camera.lookAt(c.target);
        return;
      }
    }
    const tw = tween.current;
    if (tw) {
      const k = Math.min(1, (performance.now() - tw.start) / tw.duration);
      camera.position.lerpVectors(tw.fromPos, tw.toPos, ease(k));
      c.target.lerpVectors(tw.fromTarget, tw.toTarget, ease(k));
      if (k >= 1) tween.current = null;
      c.update();
      return;
    }
    if (!reducedMotion && performance.now() - lastInteraction.current > IDLE_MS) {
      const offset = camera.position.clone().sub(c.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), AUTO_ROTATE_RAD_PER_S * delta);
      camera.position.copy(c.target).add(offset);
      c.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={DEFAULT_TARGET}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={10 * DEG}
      maxPolarAngle={80 * DEG}
      onStart={() => {
        lastInteraction.current = performance.now();
        tween.current = null;
      }}
      onEnd={() => {
        lastInteraction.current = performance.now();
      }}
    />
  );
}
