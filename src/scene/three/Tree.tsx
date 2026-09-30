import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';
import { coneSurfaceY, TREE_LAYOUT, type PineLayer } from '../treeLayout';
import { pineSprigTexture } from './textures';

/**
 * Cây thông 3D (FR-001-01): thân gỗ, 7 tầng lá hình "váy" mép răng cưa rủ xuống,
 * tuyết đọng trên phần mặt phẳng, hàng nghìn cành lá kim (instanced) lay theo gió.
 */

const GREEN_DEEP = new THREE.Color('#0f3a24');
const GREEN = new THREE.Color('#1f5c34');
const GREEN_LIGHT = new THREE.Color('#3f8a4c');
const SNOW = new THREE.Color('#f3f7ff');

function layerGeometry(layer: PineLayer, seed: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const { radius: R, height: H } = layer;
  // Mặt cong lõm: phẳng gần mép, dốc gần chóp
  const profile: THREE.Vector2[] = [];
  const rows = 18;
  for (let j = 0; j <= rows; j++) {
    const t = j / rows; // 0 = chóp, 1 = mép
    profile.push(new THREE.Vector2(R * t, H * (1 - t) * (1 - t)));
  }
  const geo = new THREE.LatheGeometry(profile, 64);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const tips = Math.max(9, Math.round(R * 7));
  const phase = rnd() * Math.PI * 2;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    const k = r / R;
    if (k > 0.55) {
      // Mép răng cưa: đầu cành chìa ra, khe giữa các cành rủ xuống
      const th = Math.atan2(v.z, v.x);
      const spike = Math.pow(Math.abs(Math.sin(th * tips * 0.5 + phase)), 2.5);
      const w = (k - 0.55) / 0.45;
      const scale = 1 + 0.09 * spike * w;
      v.x *= scale;
      v.z *= scale;
      v.y -= (0.1 * spike + 0.06) * w * w;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  // Màu: xanh lá biến thiên, tuyết đọng ở chỗ mặt gần nằm ngang
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 5.3 + z * 3.1) * 0.5 + Math.sin(z * 6.7 - y * 4.1) * 0.5;
    c.copy(GREEN_DEEP).lerp(GREEN, 0.5 + n * 0.35).lerp(GREEN_LIGHT, Math.max(0, n) * 0.35);
    const flat = THREE.MathUtils.smoothstep(Math.abs(nor.getY(i)), 0.72, 0.93);
    const patch = THREE.MathUtils.smoothstep(Math.sin(x * 4.1) * Math.cos(z * 3.7) + n * 0.6, -0.2, 0.5);
    c.lerp(SNOW, flat * patch * 0.9);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.translate(0, layer.y, 0);
  return geo;
}

interface Sprig {
  matrix: THREE.Matrix4;
  color: THREE.Color;
}

function buildSprigs(): Sprig[] {
  const rnd = mulberry32(31);
  const out: Sprig[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const layer of TREE_LAYOUT.layers) {
    const count = Math.round(layer.radius * 120);
    for (let i = 0; i < count; i++) {
      const th = rnd() * Math.PI * 2;
      const k = 0.15 + Math.sqrt(rnd()) * 0.8;
      const r = layer.radius * k;
      const y = coneSurfaceY(layer, r)! + 0.03;
      const outward = new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
      // Cành chĩa ra ngoài theo độ dốc mặt nón, hơi rủ xuống
      const slope = ((2 * layer.height) / layer.radius) * (1 - k);
      const stem = outward.clone().multiplyScalar(1).add(new THREE.Vector3(0, -slope - 0.15 - rnd() * 0.2, 0)).normalize();
      const side = new THREE.Vector3().crossVectors(up, outward).normalize();
      const normal = new THREE.Vector3().crossVectors(side, stem).normalize();
      const roll = (rnd() - 0.5) * 0.8;
      const sideRolled = side.clone().applyAxisAngle(stem, roll);
      const normalRolled = normal.clone().applyAxisAngle(stem, roll);
      const s = 0.42 + rnd() * 0.3;
      // Không cho cành thò quá mép tầng để không che chỗ treo tờ giấy
      if (r + s * 0.8 > layer.radius + 0.05) continue;
      const basis = new THREE.Matrix4().makeBasis(sideRolled, stem, normalRolled);
      const matrix = new THREE.Matrix4()
        .makeTranslation(outward.x * r + stem.x * s * 0.35, y + stem.y * s * 0.35, outward.z * r + stem.z * s * 0.35)
        .multiply(basis)
        .multiply(new THREE.Matrix4().makeScale(s * 0.8, s, s));
      const color = GREEN_DEEP.clone().lerp(GREEN_LIGHT, 0.25 + rnd() * 0.6);
      if (rnd() < 0.28 && k > 0.5) color.lerp(SNOW, 0.55 + rnd() * 0.3);
      out.push({ matrix, color });
    }
  }
  return out;
}

export function Tree({ animate }: { animate: boolean }) {
  const layers = useMemo(() => TREE_LAYOUT.layers.map((l, i) => layerGeometry(l, 100 + i)), []);
  const sprigs = useMemo(buildSprigs, []);
  const sprigRef = useRef<THREE.InstancedMesh>(null);
  const time = useRef({ value: 0 });

  const sprigMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: pineSprigTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 });
    // Gió nhẹ: lay cành theo vị trí từng instance
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time.current;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
           float w = sin(uTime * 1.3 + ip.x * 1.1 + ip.z * 0.8 + ip.y * 0.5) * 0.05 * (position.y + 0.5);
           transformed.x += w; transformed.z += w * 0.6;`,
        );
    };
    return m;
  }, []);

  useLayoutEffect(() => {
    const mesh = sprigRef.current;
    if (!mesh) return;
    sprigs.forEach((s, i) => {
      mesh.setMatrixAt(i, s.matrix);
      mesh.setColorAt(i, s.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [sprigs]);

  useFrame((_, delta) => {
    if (animate) time.current.value += delta;
  });

  const { trunk } = TREE_LAYOUT;
  return (
    <group>
      <mesh position={[0, (trunk.top - 0.2) / 2 - 0.1, 0]}>
        <cylinderGeometry args={[trunk.radius * 0.55, trunk.radius, trunk.top + 0.2, 12]} />
        <meshStandardMaterial color="#4b3021" roughness={0.95} />
      </mesh>
      {/* Rễ nổi quanh gốc */}
      {[0, 1.3, 2.5, 3.8, 5.1].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.35, 0.05, Math.sin(a) * 0.35]} rotation={[0, -a, Math.PI / 2.6]}>
          <cylinderGeometry args={[0.05, 0.12, 0.5, 6]} />
          <meshStandardMaterial color="#4b3021" roughness={0.95} />
        </mesh>
      ))}
      {layers.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial vertexColors roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <instancedMesh ref={sprigRef} args={[undefined, sprigMaterial, sprigs.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
    </group>
  );
}
