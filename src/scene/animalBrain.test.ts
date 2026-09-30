import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/shared/lib/random';
import { createBrain, REINDEER, REINDEER_COUNT, stepBrain, type AnimalBrain } from './animalBrain';
import { GROUND_LAYOUT, GROUND_OBSTACLES } from './groundLayout';
import { snowflakeCount } from './snow';

function minClearance(b: AnimalBrain): number {
  return Math.min(...GROUND_OBSTACLES.map((o) => Math.hypot(b.x - o.x, b.z - o.z) - (o.r + REINDEER.radius)));
}

describe('Tuyết rơi (FR-001-15, NFR-001-09)', () => {
  it('AC-001-14: 3000 bông trên desktop, 1200 trên màn nhỏ hoặc chất lượng thấp', () => {
    expect(snowflakeCount(1280, false)).toBe(3000);
    expect(snowflakeCount(390, false)).toBe(1200);
    expect(snowflakeCount(1920, true)).toBe(1200);
  });
});

describe('Người tuyết (FR-001-17)', () => {
  it('AC-001-16: có 3–4 người tuyết và đều là vật cản', () => {
    const { snowmen } = GROUND_LAYOUT;
    expect(snowmen.length).toBeGreaterThanOrEqual(3);
    expect(snowmen.length).toBeLessThanOrEqual(4);
    for (const s of snowmen) {
      expect(GROUND_OBSTACLES.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < 1e-6 && o.r >= 0.4 * s.scale)).toBe(true);
    }
  });
});

describe('Tuần lộc (FR-001-16, FR-001-18)', () => {
  it('AC-001-15: có 4–6 con tuần lộc', () => {
    expect(REINDEER_COUNT).toBeGreaterThanOrEqual(4);
    expect(REINDEER_COUNT).toBeLessThanOrEqual(6);
  });

  it('AC-001-17: mô phỏng 2 phút, không lần nào chồng lên vật cản và có di chuyển', () => {
    const rnds = Array.from({ length: REINDEER_COUNT }, (_, i) => mulberry32(300 + i * 29));
    const herd = rnds.map((r) => createBrain(r, GROUND_OBSTACLES, REINDEER));
    for (const b of herd) expect(minClearance(b)).toBeGreaterThanOrEqual(-1e-6);

    const dt = 1 / 60;
    let moving = 0;
    const steps = 60 * 120;
    for (let step = 0; step < steps; step++) {
      herd.forEach((b, i) => {
        stepBrain(b, dt, rnds[i]!, GROUND_OBSTACLES, herd, REINDEER);
        if (b.mode === 'move') moving++;
        expect(minClearance(b)).toBeGreaterThanOrEqual(-1e-6);
        expect(Math.hypot(b.x, b.z)).toBeLessThan(REINDEER.maxRing + 1.5);
      });
    }
    expect(moving).toBeGreaterThan(steps * REINDEER_COUNT * 0.3);
  });
});
