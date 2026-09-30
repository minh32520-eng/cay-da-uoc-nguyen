import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';
import { createSantaFlight, santaPosition, stepSantaFlight } from '../santaFlight';
import { antlerGeometry } from './antlers';
import { furMaterial, lumpySphere, withVerticalGradient } from './furUtils';

/**
 * Hình bóng ông già Noel cưỡi xe trượt tuyết do 4 tuần lộc kéo, bay ngang qua trước
 * mặt trăng (FR-001-20), nghỉ 5–8 s rồi bay lại, đổi hướng xen kẽ (FR-001-21).
 * Toàn bộ dựng bằng code; hướng "trước" của model là +z.
 */

const RED = '#c1121f';
const GOLD = '#e0b54a';

/* ---------------- Xe trượt tuyết ---------------- */

function sleighBodyGeometry(): THREE.BufferGeometry {
  // Mặt cắt dọc (z, y): lưng cao cuộn, ghế ngồi, mũi xe cuộn lên
  const s = new THREE.Shape();
  s.moveTo(-0.95, 0.18);
  s.bezierCurveTo(-1.05, 0.6, -1.08, 1.05, -0.85, 1.12);
  s.bezierCurveTo(-0.68, 1.16, -0.62, 0.95, -0.72, 0.86);
  s.lineTo(-0.6, 0.58);
  s.lineTo(0.3, 0.55);
  s.bezierCurveTo(0.55, 0.6, 0.62, 0.85, 0.8, 0.95);
  s.bezierCurveTo(0.95, 1.02, 1.02, 0.85, 0.9, 0.78);
  s.bezierCurveTo(0.8, 0.5, 0.72, 0.3, 0.55, 0.18);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 16 });
  // Shape nằm trong mặt XY → quay để trục dài của xe là z, bề rộng là x
  g.rotateY(Math.PI / 2);
  g.translate(-0.45, 0, 0);
  g.computeVertexNormals();
  return g;
}

function runnerGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.12, -1.0),
    new THREE.Vector3(0, 0.0, -0.7),
    new THREE.Vector3(0, 0.0, 0.7),
    new THREE.Vector3(0, 0.12, 1.05),
    new THREE.Vector3(0, 0.38, 1.12),
    new THREE.Vector3(0, 0.46, 0.95),
    new THREE.Vector3(0, 0.36, 0.88),
  ]);
  return new THREE.TubeGeometry(curve, 48, 0.035, 8, false);
}

/* ---------------- Tuần lộc bay ---------------- */

interface FlyerRefs {
  legs: (THREE.Group | null)[];
  body: THREE.Group | null;
}

function FlyingReindeer({
  position,
  red,
  refs,
  mats,
  geos,
}: {
  position: [number, number, number];
  red: boolean;
  refs: FlyerRefs;
  mats: ReturnType<typeof useSharedMats>;
  geos: ReturnType<typeof useSharedGeos>;
}) {
  const M = (g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number], r?: [number, number, number]) => (
    <mesh geometry={g} material={m} position={p} scale={s} rotation={r} />
  );
  const legPos: [number, number, number][] = [
    [0.11, -0.12, 0.3],
    [-0.11, -0.12, 0.3],
    [0.11, -0.1, -0.3],
    [-0.11, -0.1, -0.3],
  ];
  return (
    <group position={position} ref={(el) => (refs.body = el)}>
      {M(geos.bodyGrad, mats.furGrad, [0, 0, 0], [0.22, 0.23, 0.5])}
      {M(geos.bodyGrad, mats.furGrad, [0, 0.02, 0.3], [0.21, 0.24, 0.22])}
      {M(geos.mane, mats.cream, [0, 0.05, 0.42], [0.16, 0.2, 0.14])}
      {M(geos.smooth, mats.cream, [0, 0.1, -0.5], [0.06, 0.08, 0.05])}
      {/* Yên cương đỏ + chuông vàng */}
      <mesh material={mats.strap} rotation={[0, 0, 0]} position={[0, 0.02, 0.05]}>
        <torusGeometry args={[0.24, 0.028, 8, 24]} />
      </mesh>
      {[-0.1, 0, 0.1].map((x) => (
        <mesh key={x} material={mats.gold} position={[x, -0.2, 0.08]}>
          <sphereGeometry args={[0.03, 10, 8]} />
        </mesh>
      ))}
      {legPos.map((p, i) => (
        <group key={i} position={p} ref={(el) => (refs.legs[i] = el)}>
          {M(geos.bodyGrad, mats.furGrad, [0, -0.06, 0], [0.07, 0.15, 0.09])}
          <mesh geometry={geos.leg} material={mats.shin} position={[0, -0.34, 0]} />
          {M(geos.smooth, mats.hoof, [0, -0.54, 0.01], [0.04, 0.03, 0.05])}
        </group>
      ))}
      {/* Cổ + đầu vươn về phía trước */}
      <group position={[0, 0.12, 0.44]} rotation={[-0.6, 0, 0]}>
        {M(geos.bodyGrad, mats.furGrad, [0, 0.16, 0.02], [0.1, 0.22, 0.11])}
        <group position={[0, 0.34, 0.08]} rotation={[0.9, 0, 0]}>
          {M(geos.bodyGrad, mats.furGrad, [0, 0, 0.05], [0.11, 0.115, 0.17])}
          {M(geos.smooth, mats.cream, [0, -0.04, 0.2], [0.07, 0.065, 0.1])}
          {M(geos.smooth, red ? mats.redNose : mats.nose, [0, -0.02, 0.29], red ? [0.05, 0.045, 0.04] : [0.035, 0.03, 0.025])}
          {M(geos.smooth, mats.eye, [0.09, 0.04, 0.1], [0.02, 0.022, 0.02])}
          {M(geos.smooth, mats.eye, [-0.09, 0.04, 0.1], [0.02, 0.022, 0.02])}
          <mesh geometry={geos.antlerL} material={mats.antler} position={[0.05, 0.09, -0.02]} scale={0.85} />
          <mesh geometry={geos.antlerR} material={mats.antler} position={[-0.05, 0.09, -0.02]} scale={0.85} />
        </group>
      </group>
    </group>
  );
}

function useSharedMats() {
  return useMemo(
    () => ({
      furGrad: furMaterial(),
      cream: furMaterial('#ece0cb'),
      shin: new THREE.MeshStandardMaterial({ color: '#3b2a1f', roughness: 0.9 }),
      hoof: new THREE.MeshStandardMaterial({ color: '#1e1612', roughness: 0.6 }),
      antler: new THREE.MeshStandardMaterial({ color: '#dccaa4', roughness: 0.7 }),
      eye: new THREE.MeshPhysicalMaterial({ color: '#120a06', roughness: 0.05, clearcoat: 1 }),
      nose: new THREE.MeshStandardMaterial({ color: '#1a1210', roughness: 0.3 }),
      redNose: new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 2.5, toneMapped: false }),
      strap: new THREE.MeshStandardMaterial({ color: '#9b1320', roughness: 0.5 }),
      gold: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.85, roughness: 0.25 }),
      sleigh: new THREE.MeshPhysicalMaterial({ color: RED, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
      suit: furMaterial('#c81d25'),
      white: furMaterial('#f7f7f2'),
      skin: new THREE.MeshStandardMaterial({ color: '#f1c7a6', roughness: 0.7 }),
      black: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5 }),
      sack: furMaterial('#6d3b1f'),
    }),
    [],
  );
}

function useSharedGeos() {
  return useMemo(() => {
    const base = lumpySphere(3.3);
    return {
      bodyGrad: withVerticalGradient(base, new THREE.Color('#6f4b33'), new THREE.Color('#e3d3bb')),
      mane: lumpySphere(7, 0.14),
      smooth: new THREE.SphereGeometry(1, 20, 14),
      leg: new THREE.CylinderGeometry(0.024, 0.03, 0.38, 8),
      antlerL: antlerGeometry(1),
      antlerR: antlerGeometry(-1),
      sleighBody: sleighBodyGeometry(),
      runner: runnerGeometry(),
      lumpy: lumpySphere(11, 0.05),
    };
  }, []);
}

/* ---------------- Hình bóng ---------------- */

/** Mọi bộ phận dùng một màu tối phẳng → hình bóng in trên mặt trăng (FR-001-20). */
const SILHOUETTE = new THREE.MeshBasicMaterial({ color: '#070a16', fog: false });
const SILHOUETTE_LINE = new THREE.LineBasicMaterial({ color: '#070a16', fog: false });

export function SantaSleigh({ animate }: { animate: boolean }) {
  const rnd = useMemo(() => mulberry32(2412), []);
  const flight = useRef(createSantaFlight(rnd));
  const group = useRef<THREE.Group>(null);
  const waveArm = useRef<THREE.Group>(null);
  const deer = useRef<FlyerRefs[]>([0, 1, 2, 3].map(() => ({ legs: [], body: null })));
  const mats = useSharedMats();
  const geos = useSharedGeos();

  const reinRef = useRef<THREE.LineSegments>(null);

  // Chỉ giữ hình dáng: mọi mesh/đường dùng màu hình bóng, không phủ sương mù
  useEffect(() => {
    group.current?.traverse((o) => {
      if ((o as THREE.LineSegments).isLineSegments) (o as THREE.LineSegments).material = SILHOUETTE_LINE;
      else if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = SILHOUETTE;
    });
  }, []);

  const reinGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 2 * 3), 3));
    return g;
  }, []);

  // 2 cặp tuần lộc phía trước xe (trục +z)
  const deerPos: [number, number, number][] = [
    [0.38, 0.72, 2.0],
    [-0.38, 0.72, 2.0],
    [0.38, 0.8, 3.25],
    [-0.38, 0.8, 3.25],
  ];

  useFrame(({ clock, camera }, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDelta, 0.05);
    const f = flight.current;
    stepSantaFlight(f, dt * 1000, rnd, animate);
    const t = clock.getElapsedTime();

    const flying = f.phase === 'flying';
    g.visible = flying;
    if (flying) {
      const { position, pitch, roll } = santaPosition(f.progress, f.dir);
      // Quỹ đạo tính theo hướng nhìn của camera: luôn bay ngang trời phía sau cây dù camera đã xoay
      const az = Math.atan2(camera.position.x, camera.position.z);
      const [px, py, pz] = position;
      g.position.set(px * Math.cos(az) + pz * Math.sin(az), py, -px * Math.sin(az) + pz * Math.cos(az));
      g.rotation.set(-pitch, az + (f.dir > 0 ? Math.PI / 2 : -Math.PI / 2), roll, 'YXZ');

      // Tuần lộc phi nước đại: chân trước duỗi tới, chân sau đạp ra sau, thân nhấp nhô
      deer.current.forEach((d, i) => {
        const ph = t * 9 + i * 0.7;
        if (d.body) d.body.position.y = deerPos[i]![1] + Math.sin(ph) * 0.06;
        d.legs.forEach((leg, j) => {
          if (leg) leg.rotation.x = j < 2 ? -0.5 + Math.sin(ph + j * 0.3) * 0.6 : 0.5 + Math.sin(ph + Math.PI + j * 0.3) * 0.6;
        });
      });
      // Giữa lượt bay ông già Noel vẫy tay
      if (waveArm.current) {
        const w = f.progress > 0.35 && f.progress < 0.65 ? 1 : 0;
        waveArm.current.rotation.x = -0.9 - w * (1.3 + Math.sin(t * 12) * 0.35);
      }
      // Dây cương: từ tay ông già Noel tới yên của từng con
      const arr = reinGeo.getAttribute('position') as THREE.BufferAttribute;
      deer.current.forEach((d, i) => {
        const p = deerPos[i]!;
        arr.setXYZ(i * 2, p[0] * 0.3, 1.05, 0.15);
        arr.setXYZ(i * 2 + 1, p[0], (d.body?.position.y ?? p[1]) + 0.02, p[2] - 0.05);
      });
      arr.needsUpdate = true;

    }
  });

  const M = (g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number], r?: [number, number, number]) => (
    <mesh geometry={g} material={m} position={p} scale={s} rotation={r} />
  );

  return (
    <>
      <group ref={group} scale={1.7} visible={false}>
        {/* Xe */}
        <mesh geometry={geos.sleighBody} material={mats.sleigh} />
        {[-0.5, 0.5].map((x) => (
          <group key={x}>
            <mesh geometry={geos.runner} material={mats.gold} position={[x, 0, 0]} />
            {[-0.55, 0.45].map((z) => (
              <mesh key={z} material={mats.gold} position={[x, 0.1, z]}>
                <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
              </mesh>
            ))}
            {/* Viền vàng dọc thân xe */}
            <mesh material={mats.gold} position={[x * 1.02, 0.55, -0.15]}>
              <boxGeometry args={[0.03, 0.04, 1.35]} />
            </mesh>
          </group>
        ))}

        {/* Túi quà */}
        {M(geos.lumpy, mats.sack, [0, 1.0, -0.7], [0.36, 0.42, 0.3])}
        <mesh material={mats.gold} position={[0, 1.4, -0.7]}>
          <torusGeometry args={[0.1, 0.025, 6, 16]} />
        </mesh>
        {[
          [0.12, 1.42, -0.62, '#2e86de'],
          [-0.1, 1.45, -0.75, '#27ae60'],
        ].map(([x, y, z, c]) => (
          <mesh key={String(c)} position={[x as number, y as number, z as number]} rotation={[0.3, 0.5, 0.2]}>
            <boxGeometry args={[0.16, 0.16, 0.16]} />
            <meshStandardMaterial color={c as string} roughness={0.5} />
          </mesh>
        ))}

        {/* Ông già Noel */}
        <group position={[0, 0.6, -0.15]}>
          {M(geos.lumpy, mats.suit, [0, 0.38, 0], [0.34, 0.38, 0.32])}
          <mesh material={mats.black} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.33, 0.04, 8, 28]} />
          </mesh>
          <mesh material={mats.gold} position={[0, 0.3, 0.33]}>
            <boxGeometry args={[0.1, 0.08, 0.03]} />
          </mesh>
          {M(geos.lumpy, mats.white, [0, 0.62, 0.02], [0.3, 0.1, 0.3])}
          {/* Đầu */}
          <group position={[0, 0.84, 0.03]}>
            {M(geos.smooth, mats.skin, [0, 0, 0], [0.16, 0.17, 0.16])}
            {M(geos.lumpy, mats.white, [0, -0.1, 0.07], [0.17, 0.16, 0.11])}
            {M(geos.lumpy, mats.white, [0.05, -0.02, 0.14], [0.06, 0.03, 0.03])}
            {M(geos.lumpy, mats.white, [-0.05, -0.02, 0.14], [0.06, 0.03, 0.03])}
            {M(geos.smooth, mats.skin, [0, 0.0, 0.16], [0.035, 0.03, 0.03])}
            {M(geos.smooth, mats.black, [0.055, 0.05, 0.14], [0.018, 0.02, 0.012])}
            {M(geos.smooth, mats.black, [-0.055, 0.05, 0.14], [0.018, 0.02, 0.012])}
            {/* Mũ */}
            <mesh material={mats.white} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.15, 0.045, 8, 24]} />
            </mesh>
            <mesh material={mats.suit} position={[0, 0.25, -0.05]} rotation={[-0.5, 0, 0]}>
              <coneGeometry args={[0.15, 0.36, 18]} />
            </mesh>
            {M(geos.lumpy, mats.white, [0, 0.36, -0.2], [0.06, 0.06, 0.06])}
          </group>
          {/* Tay cầm cương + tay vẫy */}
          <group position={[-0.3, 0.52, 0.05]} rotation={[-0.9, 0, 0.2]}>
            {M(geos.lumpy, mats.suit, [0, -0.15, 0], [0.08, 0.18, 0.08])}
            {M(geos.lumpy, mats.white, [0, -0.32, 0], [0.085, 0.04, 0.085])}
            {M(geos.smooth, mats.black, [0, -0.38, 0], [0.06, 0.06, 0.06])}
          </group>
          <group ref={waveArm} position={[0.3, 0.52, 0.05]} rotation={[-0.9, 0, -0.2]}>
            {M(geos.lumpy, mats.suit, [0, -0.15, 0], [0.08, 0.18, 0.08])}
            {M(geos.lumpy, mats.white, [0, -0.32, 0], [0.085, 0.04, 0.085])}
            {M(geos.smooth, mats.black, [0, -0.38, 0], [0.06, 0.06, 0.06])}
          </group>
        </group>

        {/* Đàn tuần lộc */}
        {deerPos.map((p, i) => (
          <FlyingReindeer key={i} position={p} red={i === 2} refs={deer.current[i]!} mats={mats} geos={geos} />
        ))}
        <lineSegments ref={reinRef} geometry={reinGeo}>
          <lineBasicMaterial color="#7a1b1b" />
        </lineSegments>
      </group>

    </>
  );
}
