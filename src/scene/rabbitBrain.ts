import type { Obstacle } from './groundLayout';

/**
 * "Bộ não" di chuyển của thỏ — logic thuần, không phụ thuộc three.js để kiểm thử được.
 * Thỏ nhảy vòng quanh gốc đa, lái tránh vật cản; ràng buộc cứng đẩy thỏ ra
 * khỏi vật cản nên không bao giờ đi xuyên qua đá / bụi / rễ.
 */

export const RABBIT_RADIUS = 0.2;
export const HOP_TIME = 0.38;
export const HOP_DIST = 0.34;
/** Vùng thỏ được chạy: ngoài vòng đèn đất quanh gốc, trong tầm nhìn. */
export const MIN_RING = 3.5;
export const MAX_RING = 8.5;
const LOOKAHEAD = 1.0;
const TURN_RATE = 5; // rad/s

export type RabbitMode = 'hop' | 'rest' | 'stand';

export interface RabbitBrain {
  x: number;
  z: number;
  /** Hướng mặt: vector (sin h, cos h) trên mặt phẳng XZ. */
  heading: number;
  dir: 1 | -1;
  targetRadius: number;
  mode: RabbitMode;
  timer: number;
  hopsLeft: number;
  hopPhase: number;
}

export function isFree(x: number, z: number, obstacles: readonly Obstacle[], margin = RABBIT_RADIUS): boolean {
  return obstacles.every((o) => Math.hypot(x - o.x, z - o.z) >= o.r + margin);
}

export function createBrain(rnd: () => number, obstacles: readonly Obstacle[]): RabbitBrain {
  let x = 0;
  let z = 0;
  for (let tries = 0; tries < 200; tries++) {
    const a = rnd() * Math.PI * 2;
    const r = MIN_RING + 0.3 + rnd() * (MAX_RING - MIN_RING - 0.6);
    x = Math.cos(a) * r;
    z = Math.sin(a) * r;
    if (isFree(x, z, obstacles, RABBIT_RADIUS + 0.1)) break;
  }
  return {
    x,
    z,
    heading: rnd() * Math.PI * 2,
    dir: rnd() < 0.5 ? 1 : -1,
    targetRadius: MIN_RING + 0.5 + rnd() * (MAX_RING - MIN_RING - 1),
    mode: 'rest',
    timer: rnd() * 2,
    hopsLeft: 0,
    hopPhase: 0,
  };
}

/** Đẩy thỏ ra khỏi mọi vật cản đang chồng lấn (ràng buộc cứng). */
export function resolvePenetration(b: RabbitBrain, obstacles: readonly Obstacle[]): void {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const o of obstacles) {
      const dx = b.x - o.x;
      const dz = b.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + RABBIT_RADIUS;
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

/** Hướng mong muốn: đi vòng quanh cây + giữ bán kính + né vật cản + tách khỏi thỏ khác. */
function desiredDirection(b: RabbitBrain, obstacles: readonly Obstacle[], others: readonly RabbitBrain[]): [number, number] {
  const r = Math.hypot(b.x, b.z) || 1;
  const ux = b.x / r;
  const uz = b.z / r;
  let vx = -uz * b.dir;
  let vz = ux * b.dir;
  const radial = THREE_clamp((b.targetRadius - r) * 0.6, -1, 1);
  vx += ux * radial;
  vz += uz * radial;
  if (r < MIN_RING) {
    vx += ux * 2;
    vz += uz * 2;
  } else if (r > MAX_RING) {
    vx -= ux * 2;
    vz -= uz * 2;
  }

  const fx = Math.sin(b.heading);
  const fz = Math.cos(b.heading);
  for (const o of obstacles) {
    const dx = b.x - o.x;
    const dz = b.z - o.z;
    const d = Math.hypot(dx, dz);
    const gap = d - (o.r + RABBIT_RADIUS);
    if (gap > LOOKAHEAD || d < 1e-6) continue;
    // Chỉ né vật cản ở phía trước
    if (-(dx * fx + dz * fz) / d < -0.2) continue;
    const w = Math.pow(1 - Math.max(0, gap) / LOOKAHEAD, 2) * 3;
    vx += (dx / d) * w;
    vz += (dz / d) * w;
  }
  for (const other of others) {
    if (other === b) continue;
    const dx = b.x - other.x;
    const dz = b.z - other.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.8 && d > 1e-6) {
      vx += (dx / d) * (0.8 - d) * 2;
      vz += (dz / d) * (0.8 - d) * 2;
    }
  }
  const len = Math.hypot(vx, vz) || 1;
  return [vx / len, vz / len];
}

function THREE_clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Tiến một bước thời gian. Trả về true nếu vừa bắt đầu một đợt nghỉ (để UI chọn đứng/ngồi). */
export function stepBrain(
  b: RabbitBrain,
  dt: number,
  rnd: () => number,
  obstacles: readonly Obstacle[],
  others: readonly RabbitBrain[] = [],
): void {
  b.timer -= dt;
  if (b.mode !== 'hop') {
    if (b.timer <= 0) {
      if (b.mode === 'rest' && rnd() < 0.3) {
        b.mode = 'stand';
        b.timer = 1.5 + rnd() * 2;
      } else {
        b.mode = 'hop';
        b.hopsLeft = 3 + Math.floor(rnd() * 7);
        b.hopPhase = 0;
        if (rnd() < 0.3) b.dir = b.dir === 1 ? -1 : 1;
        b.targetRadius = MIN_RING + 0.5 + rnd() * (MAX_RING - MIN_RING - 1);
      }
    }
    return;
  }

  const [dx, dz] = desiredDirection(b, obstacles, others);
  const want = Math.atan2(dx, dz);
  let diff = want - b.heading;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  b.heading += THREE_clamp(diff, -TURN_RATE * dt, TURN_RATE * dt);

  // Rẽ gắt thì chậm lại
  const speed = (HOP_DIST / HOP_TIME) * (Math.abs(diff) > 1.2 ? 0.35 : 1);
  b.x += Math.sin(b.heading) * speed * dt;
  b.z += Math.cos(b.heading) * speed * dt;
  resolvePenetration(b, obstacles);

  b.hopPhase += dt / HOP_TIME;
  if (b.hopPhase >= 1) {
    b.hopPhase = 0;
    if (--b.hopsLeft <= 0) {
      b.mode = 'rest';
      b.timer = 1.5 + rnd() * 3.5;
    }
  }
}
