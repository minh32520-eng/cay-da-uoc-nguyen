import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '@/shared/lib/random';
import { BRANCH_SLOTS } from '../branchSlots';
import { paperCenter, pointOnBranch, TREE_LAYOUT, type Branch } from '../treeLayout';
import { MOON_POSITION } from './Environment';
import { leafTexture } from './textures';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Ống cong thuôn dần theo đường Catmull-Rom — dùng cho thân, cành, rễ.
 * Tô màu vỏ cây theo đỉnh: gờ vỏ sẫm/sáng xen kẽ, rêu xanh gần gốc.
 */
function taperedTube(pts: THREE.Vector3[], r0: number, r1: number, rnd: () => number, radial = 9): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const segs = Math.max(4, Math.ceil(curve.getLength() * 4));
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const barkDark = new THREE.Color('#3a2618');
  const barkLight = new THREE.Color('#8a6444');
  const moss = new THREE.Color('#4b5a2c');
  const col = new THREE.Color();
  const ridgeSeed = rnd() * 10;

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    // Gốc phình nhẹ rồi thuôn dần
    const r = (r0 + (r1 - r0) * Math.pow(t, 0.85)) * (1 + 0.08 * Math.sin(t * 17 + ridgeSeed));
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c);
      const ridge = j % 2 === 0 ? 1.06 : 0.94;
      v.multiplyScalar(r * ridge).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);

      const n = Math.sin(v.x * 7.1 + v.y * 3.3) * 0.5 + Math.sin(v.z * 5.7 - v.y * 9.1) * 0.5;
      col.copy(barkDark).lerp(barkLight, 0.35 + n * 0.25 + (j % 2 === 0 ? 0.18 : -0.05));
      if (v.y < 0.8) col.lerp(moss, (0.8 - v.y) * 0.45);
      colors.set([col.r, col.g, col.b], idx * 3);
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function branchPoints(b: Branch, samples: number): THREE.Vector3[] {
  const pts = [V(b.start[0] * 0.3, b.start[1] - 0.25, b.start[2] * 0.3)];
  for (let i = 0; i <= samples; i++) pts.push(V(...pointOnBranch(b, i / samples)));
  return pts;
}

function buildWood(): THREE.BufferGeometry {
  const rnd = mulberry32(7);
  const parts: THREE.BufferGeometry[] = [];

  // Lõi thân + 12 thân phụ xoắn quanh — dáng cây đa cổ thụ
  parts.push(taperedTube([V(0, -0.3, 0), V(0.08, 1, -0.05), V(-0.05, 2.1, 0.06), V(0, 3.2, 0)], 0.72, 0.42, rnd, 14));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + rnd() * 0.2;
    const R = 1.05 + rnd() * 0.45;
    const twist = 0.9 + rnd() * 0.5;
    const pts = [0, 0.25, 0.5, 0.75, 1].map((k) => {
      const ang = a + twist * k;
      const rad = R + (0.38 - R) * Math.pow(k, 0.7);
      return V(Math.cos(ang) * rad, -0.25 + k * 3.15, Math.sin(ang) * rad);
    });
    parts.push(taperedTube(pts, 0.3 + rnd() * 0.08, 0.14, rnd, 8));
  }

  // Rễ nổi bò trên mặt đất
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rnd() * 0.35;
    const d = (r: number, y: number, bend = 0) => V(Math.cos(a + bend) * r, y, Math.sin(a + bend) * r);
    const len = 2.6 + rnd() * 1.4;
    parts.push(taperedTube([d(0.8, 0.7), d(1.5, 0.22, 0.05), d(len * 0.75, 0.02, -0.08), d(len, -0.18, 0.1)], 0.3, 0.04, rnd, 7));
  }

  // Cành chính, nhánh con và cành nhỏ vươn vào tán
  for (const b of TREE_LAYOUT.branches) {
    parts.push(taperedTube(branchPoints(b, 8), 0.34, 0.05, rnd, 9));
    const tip = pointOnBranch(b, 0.97);
    parts.push(taperedTube([V(...pointOnBranch(b, 0.85)), V(tip[0], tip[1] + 0.5, tip[2]), V(tip[0] * 1.02, tip[1] + 1.2, tip[2] * 1.02)], 0.06, 0.02, rnd, 5));
  }
  for (const t of TREE_LAYOUT.twigs) {
    const mid = V((t.start[0] + t.end[0]) / 2, (t.start[1] + t.end[1]) / 2 + 0.1, (t.start[2] + t.end[2]) / 2);
    parts.push(taperedTube([V(...t.start), mid, V(...t.end)], 0.11, 0.025, rnd, 6));
  }

  // Rễ phụ buông xuống đất, dày dần như cột
  for (const root of TREE_LAYOUT.roots) {
    const [x, y, z] = root.top;
    const w = () => (rnd() - 0.5) * 0.12;
    parts.push(
      taperedTube([V(x, y, z), V(x + w(), y * 0.66, z + w()), V(x + w(), y * 0.33, z + w()), V(x * 1.02, -0.15, z * 1.02)], root.radius, root.radius * 1.9, rnd, 6),
    );
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

interface Leaf {
  matrix: THREE.Matrix4;
  color: THREE.Color;
}

function buildLeaves(): { leaves: Leaf[]; fills: { position: THREE.Vector3; radius: number }[] } {
  const rnd = mulberry32(11);
  const papers = BRANCH_SLOTS.map((s) => V(...paperCenter(s)));
  const moonDir = V(...MOON_POSITION).normalize();
  const deep = new THREE.Color('#163f1f');
  const mid = new THREE.Color('#2f7036');
  const bright = new THREE.Color('#79b556');
  const young = new THREE.Color('#b7c65a');
  const leaves: Leaf[] = [];
  const fills: { position: THREE.Vector3; radius: number }[] = [];
  const q = new THREE.Quaternion();
  const up = V(0, 0, 1);
  const normal = new THREE.Vector3();

  for (const blob of TREE_LAYOUT.canopy) {
    const center = V(...blob.position);
    fills.push({ position: center, radius: blob.radius * 0.78 });
    const count = Math.round(170 * blob.radius);
    for (let i = 0; i < count; i++) {
      // Điểm ngẫu nhiên trên vỏ cầu
      const u = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      normal.set(s * Math.cos(th), u, s * Math.sin(th));
      if (normal.y < -0.45) continue; // giữ đáy tán gọn, không lấn xuống tờ giấy
      const p = center.clone().addScaledVector(normal, blob.radius * (0.82 + rnd() * 0.25));
      if (papers.some((pc) => pc.distanceToSquared(p) < 0.36)) continue;

      const dir = normal.clone().add(V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.2)).normalize();
      q.setFromUnitVectors(up, dir);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(up, rnd() * Math.PI * 2));
      const scale = 0.3 + rnd() * 0.18;
      const matrix = new THREE.Matrix4().compose(p, q, V(scale, scale * 1.15, scale));

      // Sáng hơn ở mặt hướng trăng và phía trên
      const lit = THREE.MathUtils.clamp(0.35 + normal.dot(moonDir) * 0.35 + normal.y * 0.25 + (rnd() - 0.5) * 0.3, 0, 1);
      const color = deep.clone().lerp(mid, Math.min(1, lit * 1.6)).lerp(bright, Math.max(0, lit - 0.55) * 1.6);
      if (rnd() < 0.06) color.lerp(young, 0.6);
      leaves.push({ matrix, color });
    }
  }
  return { leaves, fills };
}

export function Tree({ animate }: { animate: boolean }) {
  const wood = useMemo(buildWood, []);
  const { leaves, fills } = useMemo(buildLeaves, []);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const fillRef = useRef<THREE.InstancedMesh>(null);
  const time = useRef({ value: 0 });

  const leafMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: leafTexture(),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.75,
    });
    // Gió nhẹ: lay lá theo vị trí từng instance
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time.current;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
           float w = sin(uTime * 1.6 + ip.x * 1.3 + ip.z * 0.9) * 0.06;
           transformed.x += w; transformed.y += w * 0.5;`,
        );
    };
    return m;
  }, []);

  useLayoutEffect(() => {
    const mesh = leafRef.current;
    if (mesh) {
      leaves.forEach((l, i) => {
        mesh.setMatrixAt(i, l.matrix);
        mesh.setColorAt(i, l.color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const fill = fillRef.current;
    if (fill) {
      const m = new THREE.Matrix4();
      fills.forEach((f, i) => {
        m.compose(f.position, new THREE.Quaternion(), V(f.radius, f.radius * 0.85, f.radius));
        fill.setMatrixAt(i, m);
      });
      fill.instanceMatrix.needsUpdate = true;
    }
  }, [leaves, fills]);

  useFrame((_, delta) => {
    if (animate) time.current.value += delta;
  });

  return (
    <group>
      <mesh geometry={wood}>
        <meshStandardMaterial vertexColors roughness={0.92} />
      </mesh>
      {/* Khối tán bên trong che khe hở giữa các lá */}
      <instancedMesh ref={fillRef} args={[undefined, undefined, fills.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#12351a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={leafRef} args={[undefined, leafMaterial, leaves.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
    </group>
  );
}
