import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';
import { createBrain, REINDEER, REINDEER_COUNT, stepBrain, type AnimalBrain } from '../animalBrain';
import { GROUND_OBSTACLES } from '../groundLayout';
import { antlerGeometry } from './antlers';
import { furMaterial, lumpySphere, withVerticalGradient } from './furUtils';

/**
 * Tuần lộc quanh gốc thông (FR-001-16): thân dài, bờm cổ xù màu kem, gạc phân nhánh,
 * chân dài có móng; đi theo nhịp chéo, cúi gặm cỏ, ngẩng đầu nhìn quanh.
 * Con đầu đàn có mũi đỏ phát sáng. Di chuyển do animalBrain điều khiển (FR-001-18).
 */

const COATS = ['#6b4a32', '#7a5638', '#5e4030', '#8a6446', '#6f5240', '#7d5a3e'];
const CREAM = '#e9ddc7';

/** Đàn tuần lộc dùng chung để tách nhau ra và cho camera xem thử (?animalcam). */
export const REINDEER_HERD: AnimalBrain[] = [];

function Deer({ index, brain, animate }: { index: number; brain: AnimalBrain; animate: boolean }) {
  const root = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const earL = useRef<THREE.Mesh>(null);
  const earR = useRef<THREE.Mesh>(null);
  const rnd = useMemo(() => mulberry32(900 + index * 13), [index]);
  const anim = useRef({ t: rnd() * 10, yaw: brain.heading, lookYaw: 0, graze: 0, alert: 0, earTwitch: 0 });
  const rudolph = index === 0;

  const res = useMemo(() => {
    const coat = new THREE.Color(COATS[index % COATS.length]!);
    const cream = new THREE.Color(CREAM);
    const base = lumpySphere(index * 0.7);
    return {
      bodyGeo: withVerticalGradient(base, coat, cream),
      furGrad: furMaterial(),
      coat: furMaterial(coat),
      cream: furMaterial(cream),
      mane: lumpySphere(index + 5, 0.14),
      smooth: new THREE.SphereGeometry(1, 20, 14),
      leg: new THREE.CylinderGeometry(0.036, 0.046, 0.5, 10),
      hoof: new THREE.MeshStandardMaterial({ color: '#1e1612', roughness: 0.6 }),
      shin: furMaterial('#6b4d38'),
      collar: new THREE.MeshStandardMaterial({ color: '#b3121f', roughness: 0.5 }),
      bell: new THREE.MeshStandardMaterial({ color: '#e0b54a', metalness: 0.85, roughness: 0.25 }),
      antlerL: antlerGeometry(1),
      antlerR: antlerGeometry(-1),
      antler: new THREE.MeshStandardMaterial({ color: '#dccaa4', roughness: 0.7 }),
      eye: new THREE.MeshPhysicalMaterial({ color: '#120a06', roughness: 0.05, clearcoat: 1 }),
      nose: rudolph
        ? new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 2.2, toneMapped: false })
        : new THREE.MeshStandardMaterial({ color: '#1a1210', roughness: 0.3 }),
    };
  }, [index, rudolph]);

  useFrame((_, rawDelta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDelta, 0.05);
    const a = anim.current;
    if (animate) {
      stepBrain(brain, dt, rnd, GROUND_OBSTACLES, REINDEER_HERD, REINDEER);
      a.t += dt;
      if (brain.mode === 'stand' && rnd() < dt * 0.5) a.lookYaw = (rnd() - 0.5) * 1.4;
      if (brain.mode !== 'stand') a.lookYaw = 0;
      if (rnd() < dt * 0.6) a.earTwitch = 1;
      a.earTwitch = Math.max(0, a.earTwitch - dt * 4);
    }
    a.graze += ((brain.mode === 'rest' ? 1 : 0) - a.graze) * Math.min(1, dt * 3);
    a.alert += ((brain.mode === 'stand' ? 1 : 0) - a.alert) * Math.min(1, dt * 3);

    const moving = brain.mode === 'move';
    const ph = brain.stepPhase * Math.PI * 2;
    g.position.set(brain.x, moving ? Math.abs(Math.sin(ph * 2)) * 0.025 : 0, brain.z);
    let dh = brain.heading - a.yaw;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    a.yaw += dh * Math.min(1, dt * 6);
    g.rotation.y = a.yaw;
    shadow.current?.position.set(brain.x, 0.01, brain.z);
    if (shadow.current) shadow.current.rotation.z = -a.yaw;

    if (body.current) body.current.rotation.x = moving ? Math.sin(ph * 2) * 0.02 : 0;
    // Nhịp chéo: trước-trái & sau-phải cùng pha
    const swing = moving ? 0.38 : 0;
    const phases = [0, Math.PI, Math.PI, 0];
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(ph + phases[i]!) * swing;
    });
    if (neck.current) neck.current.rotation.x = -0.35 + a.graze * 1.25 - a.alert * 0.2;
    if (head.current) {
      const nibble = a.graze * Math.max(0, Math.sin(a.t * 6)) * 0.12;
      head.current.rotation.x = 0.25 - a.graze * 0.35 + nibble;
      head.current.rotation.y += (a.lookYaw - head.current.rotation.y) * Math.min(1, dt * 3);
    }
    if (tail.current) tail.current.rotation.x = -0.4 + Math.sin(a.t * 5) * 0.15;
    earL.current?.rotation.set(0.2 + a.earTwitch * 0.5, 0, 1.15 + a.alert * -0.4);
    earR.current?.rotation.set(0.2, 0, -1.15 - a.alert * -0.4);
  });

  const M = (geo: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number], s: [number, number, number], r?: [number, number, number]) => (
    <mesh geometry={geo} material={mat} position={p} scale={s} rotation={r} />
  );
  const legPos: [number, number, number][] = [
    [0.13, 0.82, 0.36],
    [-0.13, 0.82, 0.36],
    [0.13, 0.84, -0.36],
    [-0.13, 0.84, -0.36],
  ];

  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} scale={[0.45, 0.85, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#1b2340" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <group ref={root}>
        <group ref={body}>
          {M(res.bodyGeo, res.furGrad, [0, 0.96, 0], [0.26, 0.27, 0.55])}
          {M(res.bodyGeo, res.furGrad, [0, 0.98, -0.36], [0.25, 0.26, 0.25])}
          {M(res.bodyGeo, res.furGrad, [0, 0.95, 0.36], [0.24, 0.28, 0.25])}
          {M(res.smooth, res.cream, [0, 0.8, 0], [0.19, 0.12, 0.42])}
          {M(res.mane, res.cream, [0, 1.0, 0.5], [0.19, 0.24, 0.17])}
          <mesh ref={tail} geometry={res.smooth} material={res.cream} position={[0, 1.08, -0.6]} scale={[0.07, 0.1, 0.06]} />
          {/* Mảng lông trắng ở mông */}
          {M(res.mane, res.cream, [0, 0.98, -0.52], [0.17, 0.17, 0.08])}

          {legPos.map((p, i) => (
            <group key={i} ref={(el) => (legs.current[i] = el)} position={p}>
              {/* Đùi to nối liền thân, khớp gối, túm lông cổ chân, móng */}
              {M(res.bodyGeo, res.furGrad, [0, -0.08, 0], [0.105, 0.24, 0.13])}
              <mesh geometry={res.leg} material={res.shin} position={[0, -0.5, 0]} />
              {M(res.smooth, res.shin, [0, -0.3, 0.005], [0.05, 0.055, 0.055])}
              {M(res.mane, res.cream, [0, -0.7, 0.01], [0.055, 0.05, 0.06])}
              {M(res.smooth, res.hoof, [0, -0.78, 0.015], [0.052, 0.04, 0.065])}
            </group>
          ))}

          <group ref={neck} position={[0, 1.1, 0.46]}>
            {M(res.bodyGeo, res.furGrad, [0, 0.2, 0.06], [0.12, 0.28, 0.13], [0.35, 0, 0])}
            {/* Vòng cổ Giáng sinh có chuông */}
            <mesh material={res.collar} position={[0, 0.12, 0.03]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
              <torusGeometry args={[0.125, 0.025, 8, 24]} />
            </mesh>
            <mesh material={res.bell} position={[0, 0.03, 0.16]}>
              <sphereGeometry args={[0.04, 12, 10]} />
            </mesh>
            <group ref={head} position={[0, 0.44, 0.16]}>
              {M(res.bodyGeo, res.furGrad, [0, 0, 0.06], [0.13, 0.135, 0.2])}
              {M(res.smooth, res.cream, [0, -0.045, 0.24], [0.085, 0.08, 0.12])}
              {M(res.smooth, res.nose, [0, -0.02, 0.35], rudolph ? [0.055, 0.05, 0.045] : [0.045, 0.035, 0.03])}
              {M(res.smooth, res.eye, [0.105, 0.045, 0.12], [0.022, 0.026, 0.024])}
              {M(res.smooth, res.eye, [-0.105, 0.045, 0.12], [0.022, 0.026, 0.024])}
              <mesh ref={earL} geometry={res.smooth} material={res.coat} position={[0.13, 0.07, -0.03]} scale={[0.04, 0.11, 0.022]} />
              <mesh ref={earR} geometry={res.smooth} material={res.coat} position={[-0.13, 0.07, -0.03]} scale={[0.04, 0.11, 0.022]} />
              <mesh geometry={res.antlerL} material={res.antler} position={[0.06, 0.11, -0.01]} />
              <mesh geometry={res.antlerR} material={res.antler} position={[-0.06, 0.11, -0.01]} />
              {rudolph && (
                <pointLight position={[0, -0.02, 0.42]} color="#ff3030" intensity={1.2} distance={2.5} decay={2} />
              )}
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

export function Reindeer({ animate }: { animate: boolean }) {
  const brains = useMemo(() => {
    const herd = Array.from({ length: REINDEER_COUNT }, (_, i) => createBrain(mulberry32(300 + i * 29), GROUND_OBSTACLES, REINDEER));
    REINDEER_HERD.splice(0, REINDEER_HERD.length, ...herd);
    return herd;
  }, []);
  return (
    <>
      {brains.map((b, i) => (
        <Deer key={i} index={i} brain={b} animate={animate} />
      ))}
    </>
  );
}
