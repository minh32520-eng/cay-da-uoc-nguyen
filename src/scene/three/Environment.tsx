import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';
import { GROUND_LAYOUT, type Placed } from '../groundLayout';
import { snowflakeCount } from '../snow';
import { TREE_LAYOUT } from '../treeLayout';
import { cloudTexture, glowTexture, moonTexture, snowflakeTexture } from './textures';

export const MOON_POSITION: [number, number, number] = [-30, 13, -46];
const SNOW_WHITE = new THREE.Color('#f3f7ff');

/* ---------------- Bầu trời đêm mùa đông ---------------- */

export function Sky({ animate }: { animate: boolean }) {
  const clouds = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (animate && clouds.current) clouds.current.position.x = Math.sin(clock.getElapsedTime() * 0.02) * 4;
  });

  return (
    <>
      <color attach="background" args={['#0a1128']} />
      <fog attach="fog" args={['#1a2446', 22, 70]} />
      <Stars radius={90} depth={40} count={2500} factor={3} saturation={0.1} fade speed={animate ? 0.5 : 0} />
      <mesh position={MOON_POSITION}>
        <sphereGeometry args={[4, 48, 48]} />
        <meshBasicMaterial map={moonTexture()} color="#eef3ff" fog={false} toneMapped={false} />
      </mesh>
      <sprite position={MOON_POSITION} scale={[24, 24, 1]}>
        <spriteMaterial map={glowTexture()} color="#cfdcff" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <group ref={clouds}>
        {[
          [-28, 14, -42, 24],
          [-10, 22, -50, 20],
          [8, 16, -56, 28],
        ].map(([x, y, z, s], i) => (
          <sprite key={i} position={[x!, y!, z!]} scale={[s!, s! * 0.35, 1]}>
            <spriteMaterial map={cloudTexture()} color="#c3cde8" transparent opacity={0.3} depthWrite={false} fog={false} />
          </sprite>
        ))}
      </group>

      <ambientLight intensity={0.65} color="#9fb3ff" />
      <hemisphereLight args={['#b6c6ff', '#e8eefc', 0.8]} />
      <directionalLight position={MOON_POSITION} intensity={1.9} color="#e6ecff" />
      {/* Ánh ấm từ dây đèn trên cây */}
      <pointLight position={[2.4, 2.4, 2.4]} intensity={6} distance={10} decay={1.6} color="#ffc27a" />
      <pointLight position={[-2.4, 4, -1.8]} intensity={5} distance={10} decay={1.6} color="#ffb070" />
      <pointLight position={[0, 9.4, 0.5]} intensity={5} distance={8} decay={1.6} color="#ffe08a" />
    </>
  );
}

/* ---------------- Mặt đất tuyết ---------------- */

export function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(50, 110);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const near = new THREE.Color('#f4f7fd');
    const mid = new THREE.Color('#d7e1f3');
    const farC = new THREE.Color('#5d6b93');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y);
      // Mặt tuyết gợn nhẹ
      pos.setZ(i, (Math.sin(x * 0.7) * Math.cos(y * 0.6) * 0.08 + Math.sin(x * 2.3 + y * 1.7) * 0.03) * Math.min(1, r / 4));
      c.copy(near).lerp(mid, THREE.MathUtils.smoothstep(r, 4, 16)).lerp(farC, THREE.MathUtils.smoothstep(r, 18, 45));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <meshStandardMaterial vertexColors roughness={0.85} emissive="#223055" emissiveIntensity={0.25} />
      </mesh>
      <GroundDecor />
    </>
  );
}

/** Một InstancedMesh cho danh sách vật thể đặt sẵn. */
function PlacedInstances({ items, color, children }: { items: readonly Placed[]; color?: THREE.Color; children: ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    items.forEach((it, i) => {
      m.compose(it.position, q.setFromEuler(it.rotation), it.scale);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color ?? it.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, color]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      {children}
    </instancedMesh>
  );
}

/** Đá phủ tuyết, rừng thông nhỏ, đụn tuyết, hộp quà. */
function GroundDecor() {
  const { rocks, pines, drifts } = GROUND_LAYOUT;

  const caps = useMemo<Placed[]>(
    () =>
      rocks.map((r) => ({
        position: r.position.clone().add(new THREE.Vector3(0, r.scale.y * 0.55, 0)),
        scale: new THREE.Vector3(r.scale.x * 0.85, r.scale.y * 0.4, r.scale.z * 0.85),
        rotation: r.rotation,
        color: SNOW_WHITE,
      })),
    [rocks],
  );

  // Cây thông nhỏ = 3 tầng nón; tuyết là nón trắng nhỏ hơn đặt trên mỗi tầng
  const tiers = useMemo(
    () =>
      [0, 1, 2].map((t) => ({
        body: pines.map<Placed>((p) => ({
          position: p.position.clone().add(new THREE.Vector3(0, p.scale.y * (0.55 + t * 0.55), 0)),
          scale: new THREE.Vector3(p.scale.x * (0.9 - t * 0.22), p.scale.y * (1.1 - t * 0.15), p.scale.z * (0.9 - t * 0.22)),
          rotation: p.rotation,
          color: p.color,
        })),
        snow: pines.map<Placed>((p) => ({
          position: p.position.clone().add(new THREE.Vector3(0, p.scale.y * (0.83 + t * 0.52), 0)),
          scale: new THREE.Vector3(p.scale.x * (0.52 - t * 0.12), p.scale.y * (0.55 - t * 0.08), p.scale.z * (0.52 - t * 0.12)),
          rotation: p.rotation,
          color: SNOW_WHITE,
        })),
      })),
    [pines],
  );

  return (
    <group>
      <PlacedInstances items={rocks}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </PlacedInstances>
      <PlacedInstances items={caps}>
        <sphereGeometry args={[1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial roughness={0.8} />
      </PlacedInstances>
      <PlacedInstances items={drifts}>
        <sphereGeometry args={[1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial roughness={0.85} emissive="#223055" emissiveIntensity={0.2} />
      </PlacedInstances>
      {tiers.map((t, i) => (
        <group key={i}>
          <PlacedInstances items={t.body}>
            <coneGeometry args={[0.6, 1.1, 9]} />
            <meshStandardMaterial roughness={0.9} flatShading />
          </PlacedInstances>
          <PlacedInstances items={t.snow}>
            <coneGeometry args={[0.6, 0.6, 9]} />
            <meshStandardMaterial roughness={0.8} flatShading />
          </PlacedInstances>
        </group>
      ))}
      <Gifts />
    </group>
  );
}

function Gifts() {
  return (
    <>
      {GROUND_LAYOUT.gifts.map((g, i) => {
        const [w, h, d] = g.size;
        return (
          <group key={i} position={[g.x, h / 2 - 0.03, g.z]} rotation={[0, g.rotationY, 0]}>
            <mesh>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={g.box} roughness={0.6} />
            </mesh>
            <mesh>
              <boxGeometry args={[w * 0.18, h + 0.01, d + 0.01]} />
              <meshStandardMaterial color={g.ribbon} roughness={0.4} metalness={0.3} />
            </mesh>
            <mesh>
              <boxGeometry args={[w + 0.01, h + 0.01, d * 0.18]} />
              <meshStandardMaterial color={g.ribbon} roughness={0.4} metalness={0.3} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * w * 0.12, h / 2 + 0.05, 0]} rotation={[0, 0, s * 0.6]} scale={[1, 0.6, 0.45]}>
                <torusGeometry args={[0.07, 0.022, 8, 16]} />
                <meshStandardMaterial color={g.ribbon} roughness={0.4} metalness={0.3} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}

/* ---------------- Trang trí trên cây ---------------- */

/** Quả châu phát sáng, lắc nhẹ chu kỳ 3–5 s (FR-001-07); đặt không che chỗ treo (FR-001-19). */
export function Ornaments({ animate }: { animate: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.getElapsedTime();
    TREE_LAYOUT.ornaments.forEach((_, i) => {
      const g = refs.current[i];
      const period = 3 + (i % 3);
      if (g) g.rotation.z = Math.sin((t / period) * Math.PI * 2 + i * 1.37) * 0.12;
    });
  });
  return (
    <>
      {TREE_LAYOUT.ornaments.map((o, i) => (
        <group key={i} position={o.position} ref={(el) => (refs.current[i] = el)}>
          <mesh position={[0, o.size + 0.01, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.05, 10]} />
            <meshStandardMaterial color="#d8b24a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh>
            <sphereGeometry args={[o.size, 24, 16]} />
            <meshStandardMaterial color={o.color} emissive={o.color} emissiveIntensity={0.55} metalness={0.55} roughness={0.2} />
          </mesh>
          <sprite scale={[o.size * 6, o.size * 6, 1]}>
            <spriteMaterial map={glowTexture()} color={o.color} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
    </>
  );
}

/** Dây đèn nhấp nháy dọc mép các tầng lá (FR-001-07). */
export function GarlandLights({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { lights, lightColors } = TREE_LAYOUT;
  const base = useMemo(() => lightColors.map((c) => new THREE.Color(c)), [lightColors]);
  const phases = useMemo(() => {
    const rnd = mulberry32(5);
    return lights.map(() => rnd() * Math.PI * 2);
  }, [lights]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    lights.forEach((p, i) => {
      mesh.setMatrixAt(i, m.makeTranslation(p[0], p[1], p[2]));
      mesh.setColorAt(i, base[i]!.clone().multiplyScalar(1.5));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [lights, base]);

  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh || !animate) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < lights.length; i++) {
      const k = 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 + phases[i]!));
      mesh.setColorAt(i, tmp.copy(base[i]!).multiplyScalar(k * 1.8));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lights.length]} frustumCulled={false}>
      <sphereGeometry args={[0.045, 8, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Ngôi sao vàng trên đỉnh cây. */
export function TreeStar({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.42 : 0.18;
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 });
    g.center();
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (animate && ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.5;
  });
  return (
    <group position={[0, TREE_LAYOUT.starY, 0]}>
      <group ref={ref}>
        <mesh geometry={geo}>
          <meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={1.4} metalness={0.6} roughness={0.25} />
        </mesh>
      </group>
      <sprite scale={[3, 3, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffe08a" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/* ---------------- Tuyết rơi ---------------- */

const SNOW_BOX = { x: 20, top: 16 };

/** Tuyết rơi bằng một draw call (FR-001-15, NFR-001-09). */
export function Snowfall({ animate, lowQuality }: { animate: boolean; lowQuality: boolean }) {
  const width = useThree((s) => s.size.width);
  const count = snowflakeCount(width, lowQuality);
  return <SnowPoints key={count} count={count} animate={animate} />;
}

function SnowPoints({ count, animate }: { count: number; animate: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, seeds } = useMemo(() => {
    const rnd = mulberry32(2512);
    const positions = new Float32Array(count * 3);
    const seeds = Array.from({ length: count }, (_, i) => {
      positions[i * 3] = (rnd() * 2 - 1) * SNOW_BOX.x;
      positions[i * 3 + 1] = rnd() * SNOW_BOX.top;
      positions[i * 3 + 2] = (rnd() * 2 - 1) * SNOW_BOX.x;
      return { speed: 0.35 + rnd() * 0.6, sway: 0.2 + rnd() * 0.5, phase: rnd() * Math.PI * 2 };
    });
    return { positions, seeds };
  }, [count]);

  useFrame(({ clock }, rawDelta) => {
    const pts = ref.current;
    if (!pts || !animate) return; // reduced-motion: tuyết đứng yên (FR-001-09)
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    const wind = Math.sin(t * 0.15) * 0.25;
    for (let i = 0; i < count; i++) {
      const s = seeds[i]!;
      const j = i * 3;
      positions[j + 1] = positions[j + 1]! - s.speed * dt;
      positions[j] = positions[j]! + (Math.sin(t * s.sway + s.phase) * 0.25 + wind) * dt;
      positions[j + 2] = positions[j + 2]! + Math.cos(t * s.sway * 0.8 + s.phase) * 0.15 * dt;
      // Chạm đất → quay lại đỉnh, giữ trong hộp theo trục x
      if (positions[j + 1]! < 0) {
        positions[j + 1] = SNOW_BOX.top;
        if (Math.abs(positions[j]!) > SNOW_BOX.x) positions[j] = -Math.sign(positions[j]!) * SNOW_BOX.x * 0.9;
      }
    }
    pts.geometry.attributes.position!.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={snowflakeTexture()} color="#ffffff" size={0.13} transparent depthWrite={false} sizeAttenuation opacity={0.9} />
    </points>
  );
}
