import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GROUND_LAYOUT, type SnowmanSpot } from '../groundLayout';
import { lumpySphere } from './furUtils';

/**
 * Người tuyết (FR-001-17): 3 khối tuyết, mắt & miệng & cúc bằng than, mũi cà rốt,
 * tay cành cây, khăn quàng, mũ chóp cao hoặc mũ len. Thỉnh thoảng vẫy tay.
 */

function Arm({ side, armRef }: { side: 1 | -1; armRef?: React.Ref<THREE.Group> }) {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a2f1d', roughness: 0.95 }), []);
  return (
    <group ref={armRef} position={[side * 0.34, 1.28, 0]} rotation={[0, 0, side * -0.95]}>
      <mesh material={wood} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.014, 0.022, 0.6, 5]} />
      </mesh>
      <mesh material={wood} position={[side * 0.05, 0.52, 0]} rotation={[0, 0, side * -0.6]}>
        <cylinderGeometry args={[0.008, 0.012, 0.16, 4]} />
      </mesh>
      <mesh material={wood} position={[side * -0.04, 0.56, 0]} rotation={[0, 0, side * 0.5]}>
        <cylinderGeometry args={[0.008, 0.012, 0.14, 4]} />
      </mesh>
    </group>
  );
}

function Snowman({ spot, index, animate }: { spot: SnowmanSpot; index: number; animate: boolean }) {
  const waveArm = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const res = useMemo(
    () => ({
      snow: new THREE.MeshPhysicalMaterial({ color: '#f7faff', roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color('#dfe9ff'), emissive: '#1d2850', emissiveIntensity: 0.25 }),
      ball: lumpySphere(index * 3 + 1, 0.035),
      coal: new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.6 }),
      carrot: new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.6 }),
      scarf: new THREE.MeshStandardMaterial({ color: spot.scarf, roughness: 0.9 }),
      hat: new THREE.MeshStandardMaterial({ color: spot.hat === 'top' ? '#1b1b1f' : spot.scarf, roughness: 0.7 }),
      white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
    }),
    [index, spot],
  );

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.getElapsedTime() + index * 2.3;
    // Vẫy tay 2 s mỗi chu kỳ 7 s
    const cycle = t % 7;
    const wave = cycle < 2 ? Math.sin(cycle * Math.PI * 3) * 0.35 : 0;
    if (waveArm.current) waveArm.current.rotation.z = -0.95 + (cycle < 2 ? 0.55 + wave : 0);
    if (headRef.current) headRef.current.rotation.z = Math.sin(t * 0.8) * 0.06;
  });

  const B = (y: number, r: number, squash = 1) => <mesh geometry={res.ball} material={res.snow} position={[0, y, 0]} scale={[r, r * squash, r]} />;
  const coal = (p: [number, number, number], s: number, key?: string | number) => (
    <mesh key={key} material={res.coal} position={p} scale={s}>
      <sphereGeometry args={[1, 8, 6]} />
    </mesh>
  );

  return (
    <group position={[spot.x, 0, spot.z]} rotation={[0, spot.rotationY, 0]} scale={spot.scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.62, 24]} />
        <meshBasicMaterial color="#1b2340" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {B(0.46, 0.55, 0.88)}
      {B(1.16, 0.4, 0.92)}
      {[1.32, 1.18, 1.04].map((y, i) => coal([0, y, 0.38 - Math.abs(y - 1.18) * 0.3], 0.035, i))}
      <Arm side={1} armRef={waveArm} />
      <Arm side={-1} />

      <group ref={headRef} position={[0, 1.7, 0]}>
        {B(0, 0.28)}
        {coal([0.09, 0.07, 0.24], 0.03, 'el')}
        {coal([-0.09, 0.07, 0.24], 0.03, 'er')}
        {[-2, -1, 0, 1, 2].map((k) => coal([k * 0.045, -0.09 + Math.abs(k) * 0.02, 0.25 - Math.abs(k) * 0.01], 0.017, `m${k}`))}
        <mesh material={res.carrot} position={[0, 0, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.04, 0.26, 10]} />
        </mesh>
        {spot.hat === 'top' ? (
          <>
            <mesh material={res.hat} position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.03, 24]} />
            </mesh>
            <mesh material={res.hat} position={[0, 0.42, 0]}>
              <cylinderGeometry args={[0.19, 0.2, 0.34, 24]} />
            </mesh>
            <mesh material={res.scarf} position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.205, 0.205, 0.06, 24]} />
            </mesh>
          </>
        ) : (
          <>
            <mesh material={res.hat} position={[0, 0.12, 0]} scale={[1, 0.9, 1]}>
              <sphereGeometry args={[0.28, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh material={res.white} position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.27, 0.04, 8, 24]} />
            </mesh>
            <mesh material={res.white} position={[0, 0.4, 0]}>
              <sphereGeometry args={[0.07, 12, 10]} />
            </mesh>
          </>
        )}
      </group>

      {/* Khăn quàng + đuôi khăn */}
      <mesh material={res.scarf} position={[0, 1.47, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.06, 10, 28]} />
      </mesh>
      <mesh material={res.scarf} position={[0.12, 1.3, 0.25]} rotation={[0.3, 0, 0.15]}>
        <boxGeometry args={[0.1, 0.3, 0.04]} />
      </mesh>
    </group>
  );
}

export function Snowmen({ animate }: { animate: boolean }) {
  return (
    <>
      {GROUND_LAYOUT.snowmen.map((s, i) => (
        <Snowman key={i} spot={s} index={i} animate={animate} />
      ))}
    </>
  );
}
