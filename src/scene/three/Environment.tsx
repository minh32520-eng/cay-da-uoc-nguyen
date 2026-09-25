import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';
import { GROUND_LAYOUT, type Placed } from '../groundLayout';
import { LANTERN_BODY_OFFSET, TREE_LAYOUT, type LanternAnchor } from '../treeLayout';
import { cloudTexture, glowTexture, leafTexture, moonTexture } from './textures';

export const MOON_POSITION: [number, number, number] = [-20, 17, -45];

export function Sky({ animate }: { animate: boolean }) {
  const clouds = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (animate && clouds.current) clouds.current.position.x = Math.sin(clock.getElapsedTime() * 0.02) * 4;
  });

  return (
    <>
      <color attach="background" args={['#060a1d']} />
      <fog attach="fog" args={['#0a1030', 24, 75]} />
      <Stars radius={90} depth={40} count={3000} factor={3.2} saturation={0.2} fade speed={animate ? 0.5 : 0} />

      {/* Trăng rằm */}
      <mesh position={MOON_POSITION}>
        <sphereGeometry args={[4.6, 64, 64]} />
        <meshBasicMaterial map={moonTexture()} fog={false} toneMapped={false} />
      </mesh>
      <sprite position={MOON_POSITION} scale={[26, 26, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffe6a0" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <sprite position={MOON_POSITION} scale={[60, 60, 1]}>
        <spriteMaterial map={glowTexture()} color="#8aa0ff" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <group ref={clouds}>
        {[
          [-26, 12, -40, 22],
          [-12, 20, -48, 18],
          [4, 15, -55, 26],
        ].map(([x, y, z, s], i) => (
          <sprite key={i} position={[x!, y!, z!]} scale={[s!, s! * 0.35, 1]}>
            <spriteMaterial map={cloudTexture()} color="#b9c3ef" transparent opacity={0.28} depthWrite={false} fog={false} />
          </sprite>
        ))}
      </group>

      <ambientLight intensity={0.55} color="#8e9cf0" />
      <hemisphereLight args={['#9fb0ff', '#2a3a1c', 0.9]} />
      <directionalLight position={MOON_POSITION} intensity={2.2} color="#f1f3ff" />
      <pointLight position={[2.2, 2.4, 2.2]} intensity={9} distance={11} decay={1.6} color="#ffa24d" />
      <pointLight position={[-2.4, 2.6, -2]} intensity={7} distance={11} decay={1.6} color="#ff8a3d" />
      <pointLight position={[0.5, 1.2, -2.6]} intensity={4} distance={8} decay={1.6} color="#ffcf7a" />
    </>
  );
}

export function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(48, 96, 0, Math.PI * 2);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const dirt = new THREE.Color('#3a2c1d');
    const grass = new THREE.Color('#1f3a22');
    const far = new THREE.Color('#0b1420');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      c.copy(dirt).lerp(grass, THREE.MathUtils.smoothstep(r, 1.5, 5)).lerp(far, THREE.MathUtils.smoothstep(r, 14, 40));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  return (
    <>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <Grass />
      <GroundDecor />
    </>
  );
}

function Grass() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 5200;
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.035, 0.34, 3, 1, true);
    g.translate(0, 0.17, 0);
    return g;
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rnd = mulberry32(3);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    // Cỏ mọc thành từng khóm
    const clumps = Array.from({ length: 180 }, () => ({ a: rnd() * Math.PI * 2, r: 1.6 + Math.pow(rnd(), 1.4) * 15 }));
    for (let i = 0; i < COUNT; i++) {
      const clump = clumps[i % clumps.length]!;
      const spread = 0.25 + clump.r * 0.04;
      const a = clump.a + ((rnd() - 0.5) * spread) / clump.r;
      const r = Math.max(1.3, clump.r + (rnd() - 0.5) * spread * 2);
      e.set((rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5);
      q.setFromEuler(e);
      const s = 0.6 + rnd() * 0.9;
      m.compose(new THREE.Vector3(Math.cos(a) * r, -0.05, Math.sin(a) * r), q, new THREE.Vector3(s, s * (0.7 + rnd() * 0.8), s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setHSL(0.26 + rnd() * 0.06, 0.45, 0.14 + rnd() * 0.12));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, COUNT]}>
      <meshStandardMaterial roughness={1} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* ---------------- Trang trí mặt đất ---------------- */

function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, items: readonly Placed[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    items.forEach((it, i) => {
      m.compose(it.position, q.setFromEuler(it.rotation), it.scale);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, it.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [ref, items]);
}

/** Bụi cây, đá, hoa dại, lá đa rụng — bố cục lấy từ GROUND_LAYOUT (chung với vật cản của thỏ). */
function GroundDecor() {
  const bushRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const { bushes, rocks, flowers, fallen } = GROUND_LAYOUT;

  useInstances(bushRef, bushes);
  useInstances(rockRef, rocks);
  useInstances(flowerRef, flowers);
  useInstances(leafRef, fallen);

  return (
    <group>
      <instancedMesh ref={bushRef} args={[undefined, undefined, bushes.length]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={flowerRef} args={[undefined, undefined, flowers.length]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.6} emissive="#3a2a10" emissiveIntensity={0.4} />
      </instancedMesh>
      <instancedMesh ref={leafRef} args={[undefined, undefined, fallen.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={leafTexture()} alphaTest={0.5} side={THREE.DoubleSide} roughness={1} />
      </instancedMesh>
      <GroundLanterns />
    </group>
  );
}

/** Đèn giấy đặt dưới đất quanh gốc cây. */
function GroundLanterns() {
  return (
    <>
      {GROUND_LAYOUT.lanterns.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]} scale={l.s}>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 0.28, 8, 1, true]} />
            <meshStandardMaterial color={l.color} emissive={l.color} emissiveIntensity={1.4} side={THREE.DoubleSide} transparent opacity={0.92} />
          </mesh>
          <mesh position={[0, 0.29, 0]}>
            <cylinderGeometry args={[0.105, 0.105, 0.02, 8]} />
            <meshStandardMaterial color="#3a2412" />
          </mesh>
          <sprite position={[0, 0.16, 0]} scale={[0.9, 0.9, 1]}>
            <spriteMaterial map={glowTexture()} color={l.color} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
    </>
  );
}

/* ---------------- Đèn lồng ---------------- */

const LANTERN_PALETTE = [
  { body: '#e8322f', glow: '#ff7a45' },
  { body: '#f59e1b', glow: '#ffc36b' },
  { body: '#d9254f', glow: '#ff7a8f' },
  { body: '#ef4a23', glow: '#ff9150' },
];

function useRoundLanternGeometry() {
  return useMemo(() => {
    // Mặt cắt quả đèn: phình giữa, thắt hai đầu → tiện tròn 12 múi
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const y = (t - 0.5) * 0.6;
      pts.push(new THREE.Vector2(0.06 + Math.pow(Math.sin(Math.PI * t), 0.75) * 0.22, y));
    }
    return new THREE.LatheGeometry(pts, 12);
  }, []);
}

function useStarGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.36 : 0.15;
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 2 });
    g.center();
    return g;
  }, []);
}

function Lantern({ data, index, animate, round, star }: { data: LanternAnchor; index: number; animate: boolean; round: THREE.BufferGeometry; star: THREE.BufferGeometry }) {
  const ref = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const palette = data.kind === 'star' ? { body: '#ffc93c', glow: '#ffe08a' } : LANTERN_PALETTE[index % LANTERN_PALETTE.length]!;
  const period = 3 + (index % 3); // chu kỳ 3–5 s (FR-001-07)
  const phase = index * 1.37;

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.z = Math.sin((t / period) * Math.PI * 2 + phase) * 0.1;
      ref.current.rotation.x = Math.cos((t / period) * Math.PI * 2 + phase) * 0.05;
    }
    if (data.kind === 'star' && body.current) body.current.rotation.y = t * 0.4 + phase;
  });

  const y = -data.drop - LANTERN_BODY_OFFSET;
  return (
    <group ref={ref} position={data.anchor}>
      <mesh position={[0, -data.drop / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, data.drop, 4]} />
        <meshBasicMaterial color="#2b1a0e" />
      </mesh>
      {data.kind === 'round' ? (
        <group position={[0, y, 0]}>
          <mesh geometry={round}>
            <meshStandardMaterial color={palette.body} emissive={palette.body} emissiveIntensity={1.35} roughness={0.55} flatShading side={THREE.DoubleSide} />
          </mesh>
          {[0.31, -0.31].map((cy) => (
            <mesh key={cy} position={[0, cy, 0]}>
              <cylinderGeometry args={[0.085, 0.095, 0.045, 16]} />
              <meshStandardMaterial color="#d6a23a" metalness={0.7} roughness={0.35} />
            </mesh>
          ))}
          {/* Tua rua */}
          <mesh position={[0, -0.47, 0]}>
            <cylinderGeometry args={[0.012, 0.045, 0.28, 8]} />
            <meshStandardMaterial color="#b3141c" emissive="#6d0a10" />
          </mesh>
        </group>
      ) : (
        <group position={[0, y, 0]}>
          <mesh ref={body} geometry={star}>
            <meshStandardMaterial color={palette.body} emissive="#ffb321" emissiveIntensity={1.2} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.38, 0]}>
            <cylinderGeometry args={[0.01, 0.035, 0.22, 8]} />
            <meshStandardMaterial color="#c81e24" />
          </mesh>
        </group>
      )}
      <sprite position={[0, y, 0]} scale={[1.5, 1.5, 1]}>
        <spriteMaterial map={glowTexture()} color={palette.glow} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/** Đèn lồng tròn và đèn ông sao, treo ở khe giữa các cành để không che tờ giấy. */
export function Lanterns({ animate }: { animate: boolean }) {
  const round = useRoundLanternGeometry();
  const star = useStarGeometry();
  return (
    <>
      {TREE_LAYOUT.lanterns.map((l, i) => (
        <Lantern key={i} data={l} index={i} animate={animate} round={round} star={star} />
      ))}
    </>
  );
}

export const LANTERN_COUNT = TREE_LAYOUT.lanterns.length;

/* ---------------- Đom đóm ---------------- */

export function Fireflies({ animate }: { animate: boolean }) {
  const COUNT = 70;
  const ref = useRef<THREE.Points>(null);
  const seeds = useMemo(() => {
    const rnd = mulberry32(21);
    return Array.from({ length: COUNT }, () => ({
      a: rnd() * Math.PI * 2,
      r: 1.8 + rnd() * 6.5,
      y: 0.3 + rnd() * 3.2,
      s: 0.2 + rnd() * 0.5,
      p: rnd() * 10,
    }));
  }, []);
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);

  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const t = animate ? clock.getElapsedTime() : 0;
    seeds.forEach((f, i) => {
      const a = f.a + t * f.s * 0.15;
      positions[i * 3] = Math.cos(a) * f.r + Math.sin(t * f.s + f.p) * 0.4;
      positions[i * 3 + 1] = f.y + Math.sin(t * f.s * 1.7 + f.p) * 0.35;
      positions[i * 3 + 2] = Math.sin(a) * f.r + Math.cos(t * f.s + f.p) * 0.4;
    });
    pts.geometry.attributes.position!.needsUpdate = true;
    const mat = pts.material as THREE.PointsMaterial;
    mat.opacity = 0.75 + Math.sin(t * 2.3) * 0.2;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={glowTexture()} color="#fff0a0" size={0.22} transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}
