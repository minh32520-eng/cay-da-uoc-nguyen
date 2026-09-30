import * as THREE from 'three';
import { mulberry32 } from '@/shared/lib/random';
import { TREE_LAYOUT } from './treeLayout';

/**
 * Bố cục mặt đất phủ tuyết (người tuyết, đá, rừng thông nhỏ, hộp quà, đụn tuyết)
 * sinh theo seed cố định. Tách khỏi phần render để tuần lộc biết chỗ nào có vật cản.
 */

export interface Placed {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Euler;
  color: THREE.Color;
}

export interface SnowmanSpot {
  x: number;
  z: number;
  rotationY: number;
  scale: number;
  hat: 'top' | 'beanie';
  scarf: string;
}

export interface Gift {
  x: number;
  z: number;
  size: [number, number, number];
  rotationY: number;
  box: string;
  ribbon: string;
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
    const r = rMin + Math.pow(rnd(), 1.2) * (rMax - rMin);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!(z > 3.5 && Math.abs(x) < 2)) return { x, z };
  }
}

function far(x: number, z: number, taken: { x: number; z: number; r: number }[], r: number) {
  return taken.every((t) => Math.hypot(t.x - x, t.z - z) >= t.r + r);
}

function build() {
  const rnd = mulberry32(1225);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const taken: { x: number; z: number; r: number }[] = [{ x: 0, z: 0, r: 3.6 }];

  // Người tuyết: 3 người đứng quanh gốc, quay mặt ra ngoài (FR-001-17)
  const snowmen: SnowmanSpot[] = (
    [
      [2.3, 5.4, 'top', '#c0392b'],
      [0.75, 5.8, 'beanie', '#27ae60'],
      [4.2, 6.2, 'beanie', '#2980b9'],
    ] as const
  ).map(([a, r, hat, scarf], i) => {
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    taken.push({ x, z, r: 0.9 });
    return { x, z, rotationY: Math.atan2(x, z) + (i - 1) * 0.3, scale: 1 - i * 0.08, hat, scarf };
  });

  // Đá phủ tuyết
  const rocks: Placed[] = [];
  while (rocks.length < 14) {
    const { x, z } = ringPoint(rnd, 4.5, 15);
    const s = 0.22 + rnd() * 0.35;
    if (!far(x, z, taken, s + 0.3)) continue;
    taken.push({ x, z, r: s });
    rocks.push({
      position: V(x, s * 0.25, z),
      scale: V(s * (1 + rnd() * 0.5), s * (0.55 + rnd() * 0.35), s),
      rotation: new THREE.Euler(rnd() * 0.3, rnd() * Math.PI * 2, rnd() * 0.3),
      color: new THREE.Color().setHSL(0.6, 0.06, 0.28 + rnd() * 0.12),
    });
  }

  // Rừng thông nhỏ ở vòng ngoài
  const pines: Placed[] = [];
  while (pines.length < 30) {
    const { x, z } = ringPoint(rnd, 9.5, 24);
    const s = 0.7 + rnd() * 1.1;
    if (!far(x, z, taken, s * 0.7)) continue;
    taken.push({ x, z, r: s * 0.7 });
    pines.push({
      position: V(x, 0, z),
      scale: V(s, s * (0.9 + rnd() * 0.4), s),
      rotation: new THREE.Euler(0, rnd() * Math.PI * 2, 0),
      color: new THREE.Color().setHSL(0.36 + rnd() * 0.05, 0.45, 0.16 + rnd() * 0.08),
    });
  }

  // Hộp quà dưới gốc cây
  const giftColors = [
    ['#c0392b', '#f1c40f'],
    ['#2e86de', '#ecf0f1'],
    ['#27ae60', '#e74c3c'],
    ['#8e44ad', '#f5cd79'],
    ['#f39c12', '#c0392b'],
    ['#ecf0f1', '#c0392b'],
  ] as const;
  const gifts: Gift[] = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4;
    const r = 1.2 + rnd() * 1.5;
    const w = 0.35 + rnd() * 0.3;
    const [box, ribbon] = giftColors[i % giftColors.length]!;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, size: [w, 0.25 + rnd() * 0.35, w * (0.8 + rnd() * 0.4)], rotationY: rnd() * Math.PI, box, ribbon };
  });

  // Đụn tuyết thấp (không phải vật cản)
  const drifts: Placed[] = Array.from({ length: 28 }, () => {
    const { x, z } = ringPoint(rnd, 3.8, 20);
    const s = 0.6 + rnd() * 1.4;
    return {
      position: V(x, -0.02, z),
      scale: V(s, s * 0.18, s * (0.6 + rnd() * 0.5)),
      rotation: new THREE.Euler(0, rnd() * Math.PI, 0),
      color: new THREE.Color('#eef3fb'),
    };
  });

  // Vật cản cho tuần lộc: thân cây + tầng lá thấp nhất, người tuyết, đá, thông nhỏ, quà
  const obstacles: Obstacle[] = [
    { x: 0, z: 0, r: TREE_LAYOUT.layers[0]!.radius + 0.15 },
    ...snowmen.map((s) => ({ x: s.x, z: s.z, r: 0.55 * s.scale })),
    ...rocks.map((r) => ({ x: r.position.x, z: r.position.z, r: Math.max(r.scale.x, r.scale.z) * 1.05 })),
    ...pines.map((p) => ({ x: p.position.x, z: p.position.z, r: 0.6 * p.scale.x })),
    ...gifts.map((g) => ({ x: g.x, z: g.z, r: Math.hypot(g.size[0], g.size[2]) / 2 })),
  ];

  return { snowmen, rocks, pines, gifts, drifts, obstacles };
}

export const GROUND_LAYOUT = build();
export const GROUND_OBSTACLES: readonly Obstacle[] = GROUND_LAYOUT.obstacles;
