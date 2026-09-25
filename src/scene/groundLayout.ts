import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';
import { TREE_LAYOUT } from './treeLayout';

/**
 * Bố cục trang trí mặt đất (bụi cây, đá, hoa, lá rụng, đèn đất) sinh theo seed cố định.
 * Tách khỏi phần render để thỏ biết chỗ nào có vật cản.
 */

export interface Placed {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Euler;
  color: THREE.Color;
}

export interface GroundLantern {
  x: number;
  z: number;
  s: number;
  color: string;
}

/** Vật cản trên mặt đất (hình tròn trên mặt phẳng XZ). */
export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

/** Điểm trên vành khăn quanh gốc, chừa lối trống phía trước camera. */
function ringPoint(rnd: () => number, rMin: number, rMax: number): { x: number; z: number } {
  for (;;) {
    const a = rnd() * Math.PI * 2;
    const r = rMin + Math.pow(rnd(), 1.3) * (rMax - rMin);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!(z > 2.5 && Math.abs(x) < 1.6)) return { x, z };
  }
}

function build() {
  const rnd = mulberry32(55);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const E = () => new THREE.Euler(rnd() * 0.3, rnd() * Math.PI * 2, rnd() * 0.3);

  const bushes: Placed[] = [];
  for (let i = 0; i < 34; i++) {
    const { x, z } = ringPoint(rnd, 3.2, 17);
    const n = 3 + Math.floor(rnd() * 3);
    const size = 0.35 + rnd() * 0.45;
    for (let k = 0; k < n; k++) {
      const s = size * (0.6 + rnd() * 0.5);
      bushes.push({
        position: V(x + (rnd() - 0.5) * size * 1.4, s * 0.55, z + (rnd() - 0.5) * size * 1.4),
        scale: V(s, s * (0.75 + rnd() * 0.3), s),
        rotation: E(),
        color: new THREE.Color().setHSL(0.27 + rnd() * 0.07, 0.45, 0.13 + rnd() * 0.1),
      });
    }
  }

  const rocks: Placed[] = [];
  for (let i = 0; i < 26; i++) {
    const { x, z } = i < 10 ? ringPoint(rnd, 1.8, 3.4) : ringPoint(rnd, 3.5, 15);
    const s = 0.12 + rnd() * (i < 10 ? 0.22 : 0.35);
    rocks.push({
      position: V(x, s * 0.25, z),
      scale: V(s * (1 + rnd() * 0.6), s * (0.5 + rnd() * 0.4), s),
      rotation: E(),
      color: new THREE.Color().setHSL(0.08 + rnd() * 0.05, 0.08, 0.2 + rnd() * 0.15),
    });
  }

  const hues = [0.13, 0.13, 0.0, 0.92, 0.75];
  const flowers: Placed[] = [];
  for (let i = 0; i < 420; i++) {
    const { x, z } = ringPoint(rnd, 2, 13);
    const s = 0.035 + rnd() * 0.03;
    const h = hues[Math.floor(rnd() * hues.length)]!;
    flowers.push({
      position: V(x, 0.08 + rnd() * 0.18, z),
      scale: V(s, s * 0.7, s),
      rotation: E(),
      color: h === 0 ? new THREE.Color('#f5f1e6') : new THREE.Color().setHSL(h, 0.75, 0.62),
    });
  }

  const fallen: Placed[] = [];
  for (let i = 0; i < 260; i++) {
    const { x, z } = ringPoint(rnd, 1.1, 6);
    const s = 0.12 + rnd() * 0.08;
    fallen.push({
      position: V(x, -0.03 + rnd() * 0.01, z),
      scale: V(s, s * 1.3, s),
      rotation: new THREE.Euler(-Math.PI / 2 + (rnd() - 0.5) * 0.3, 0, rnd() * Math.PI * 2),
      color: new THREE.Color().setHSL(0.08 + rnd() * 0.12, 0.55, 0.22 + rnd() * 0.18),
    });
  }

  const lr = mulberry32(88);
  const lanternColors = ['#ff6b3d', '#ffb938', '#ff4d6d', '#ffd166'];
  const lanterns: GroundLantern[] = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + 0.35 + lr() * 0.2;
    const r = 2.3 + lr() * 0.9;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, color: lanternColors[i % lanternColors.length]!, s: 0.8 + lr() * 0.4 };
  });

  // Vật cản cho thỏ: đá, từng khối bụi, đèn đất, chân rễ phụ
  const obstacles: Obstacle[] = [
    ...rocks.map((r) => ({ x: r.position.x, z: r.position.z, r: Math.max(r.scale.x, r.scale.z) * 1.05 })),
    ...bushes.map((b) => ({ x: b.position.x, z: b.position.z, r: b.scale.x * 0.95 })),
    ...lanterns.map((l) => ({ x: l.x, z: l.z, r: 0.14 * l.s })),
    ...TREE_LAYOUT.roots.map((root) => ({ x: root.top[0] * 1.02, z: root.top[2] * 1.02, r: root.radius * 1.9 + 0.02 })),
  ];

  return { bushes, rocks, flowers, fallen, lanterns, obstacles };
}

export const GROUND_LAYOUT = build();
export const GROUND_OBSTACLES: readonly Obstacle[] = GROUND_LAYOUT.obstacles;
