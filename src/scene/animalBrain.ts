import type { Obstacle } from './groundLayout';

/**
 * "Bộ não" di chuyển của thú quanh gốc cây — logic thuần, không phụ thuộc three.js
 * để mô phỏng và kiểm thử được (NFR-001-10).
 * Thú đi vòng quanh cây, lái tránh vật cản; ràng buộc cứng đẩy thú ra khỏi
 * vật cản nên không bao giờ đi xuyên qua đá / người tuyết / thân cây (FR-001-18).
 */

export interface AnimalProfile {
  /** Bán kính thân trên mặt đất. */
  radius: number;
  /** Tốc độ đi (đơn vị/giây). */
  speed: number;
  /** Thời gian một chu kỳ bước chân. */
  stepTime: number;
  minRing: number;
  maxRing: number;
  lookahead: number;
  /** rad/s */
  turnRate: number;
  /** Khoảng cách muốn giữ với con khác. */
  personalSpace: number;
}

export const REINDEER: AnimalProfile = {
  radius: 0.45,
  speed: 0.6,
  stepTime: 0.9,
  minRing: 4.4,
  maxRing: 9,
  lookahead: 1.5,
  turnRate: 2.2,
  personalSpace: 1.6,
};

export const REINDEER_COUNT = 5;

/** move = đi, rest = cúi gặm cỏ, stand = ngẩng đầu nhìn quanh. */
export type AnimalMode = 'move' | 'rest' | 'stand';

export interface AnimalBrain {
  x: number;
  z: number;
  /** Hướng mặt: vector (sin h, cos h) trên mặt phẳng XZ. */
  heading: number;
  dir: 1 | -1;
  targetRadius: number;
  mode: AnimalMode;
  timer: number;
  stepsLeft: number;
  stepPhase: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function isFree(x: number, z: number, obstacles: readonly Obstacle[], margin: number): boolean {
  return obstacles.every((o) => Math.hypot(x - o.x, z - o.z) >= o.r + margin);
}

export function createBrain(rnd: () => number, obstacles: readonly Obstacle[], p: AnimalProfile): AnimalBrain {
  let x = p.minRing + 1;
  let z = 0;
  // ERR-001-06: thử tối đa 200 vị trí trống
  for (let tries = 0; tries < 200; tries++) {
    const a = rnd() * Math.PI * 2;
    const r = p.minRing + 0.3 + rnd() * (p.maxRing - p.minRing - 0.6);
    x = Math.cos(a) * r;
    z = Math.sin(a) * r;
    if (isFree(x, z, obstacles, p.radius + 0.1)) break;
  }
  const b: AnimalBrain = {
    x,
    z,
    heading: rnd() * Math.PI * 2,
    dir: rnd() < 0.5 ? 1 : -1,
    targetRadius: p.minRing + 0.5 + rnd() * (p.maxRing - p.minRing - 1),
    mode: 'rest',
    timer: rnd() * 3,
    stepsLeft: 0,
    stepPhase: 0,
  };
  resolvePenetration(b, obstacles, p);
  return b;
}

/** Đẩy thú ra khỏi mọi vật cản đang chồng lấn (ràng buộc cứng). */
export function resolvePenetration(b: AnimalBrain, obstacles: readonly Obstacle[], p: AnimalProfile): void {
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (const o of obstacles) {
      const dx = b.x - o.x;
      const dz = b.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + p.radius;
      if (d < min) {
        const nx = d > 1e-6 ? dx / d : 1;
        const nz = d > 1e-6 ? dz / d : 0;
        b.x = o.x + nx * min;
        b.z = o.z + nz * min;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/** Hướng mong muốn: đi vòng quanh cây + giữ bán kính + né vật cản + tách khỏi con khác. */
function desiredDirection(
  b: AnimalBrain,
  obstacles: readonly Obstacle[],
  others: readonly AnimalBrain[],
  p: AnimalProfile,
): [number, number] {
  const r = Math.hypot(b.x, b.z) || 1;
  const ux = b.x / r;
  const uz = b.z / r;
  let vx = -uz * b.dir;
  let vz = ux * b.dir;
  const radial = clamp((b.targetRadius - r) * 0.5, -1, 1);
  vx += ux * radial;
  vz += uz * radial;
  if (r < p.minRing) {
    vx += ux * 2;
    vz += uz * 2;
  } else if (r > p.maxRing) {
    vx -= ux * 2;
    vz -= uz * 2;
  }

  const fx = Math.sin(b.heading);
  const fz = Math.cos(b.heading);
  for (const o of obstacles) {
    const dx = b.x - o.x;
    const dz = b.z - o.z;
    const d = Math.hypot(dx, dz);
    const gap = d - (o.r + p.radius);
    if (gap > p.lookahead || d < 1e-6) continue;
    if (-(dx * fx + dz * fz) / d < -0.2) continue; // chỉ né vật phía trước
    const w = Math.pow(1 - Math.max(0, gap) / p.lookahead, 2) * 3;
    vx += (dx / d) * w;
    vz += (dz / d) * w;
  }
  for (const other of others) {
    if (other === b) continue;
    const dx = b.x - other.x;
    const dz = b.z - other.z;
    const d = Math.hypot(dx, dz);
    if (d < p.personalSpace && d > 1e-6) {
      vx += (dx / d) * (p.personalSpace - d) * 2;
      vz += (dz / d) * (p.personalSpace - d) * 2;
    }
  }
  const len = Math.hypot(vx, vz) || 1;
  return [vx / len, vz / len];
}

export function stepBrain(
  b: AnimalBrain,
  dt: number,
  rnd: () => number,
  obstacles: readonly Obstacle[],
  others: readonly AnimalBrain[],
  p: AnimalProfile,
): void {
  b.timer -= dt;
  if (b.mode !== 'move') {
    if (b.timer <= 0) {
      if (b.mode === 'rest' && rnd() < 0.35) {
        b.mode = 'stand';
        b.timer = 2 + rnd() * 2.5;
      } else {
        b.mode = 'move';
        b.stepsLeft = 4 + Math.floor(rnd() * 8);
        b.stepPhase = 0;
        if (rnd() < 0.3) b.dir = b.dir === 1 ? -1 : 1;
        b.targetRadius = p.minRing + 0.5 + rnd() * (p.maxRing - p.minRing - 1);
      }
    }
    return;
  }

  const [dx, dz] = desiredDirection(b, obstacles, others, p);
  const want = Math.atan2(dx, dz);
  let diff = want - b.heading;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  b.heading += clamp(diff, -p.turnRate * dt, p.turnRate * dt);

  const speed = p.speed * (Math.abs(diff) > 1.2 ? 0.35 : 1); // rẽ gắt thì chậm lại
  b.x += Math.sin(b.heading) * speed * dt;
  b.z += Math.cos(b.heading) * speed * dt;
  resolvePenetration(b, obstacles, p);

  b.stepPhase += dt / p.stepTime;
  if (b.stepPhase >= 1) {
    b.stepPhase -= 1;
    if (--b.stepsLeft <= 0) {
      b.mode = 'rest';
      b.timer = 2 + rnd() * 4;
    }
  }
}
