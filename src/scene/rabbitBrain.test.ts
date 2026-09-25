import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/shared/lib/random';
import { GROUND_OBSTACLES } from './groundLayout';
import { createBrain, MAX_RING, RABBIT_RADIUS, stepBrain, type RabbitBrain } from './rabbitBrain';

function minClearance(b: RabbitBrain): number {
  return Math.min(...GROUND_OBSTACLES.map((o) => Math.hypot(b.x - o.x, b.z - o.z) - (o.r + RABBIT_RADIUS)));
}

describe('rabbitBrain — thỏ không đi xuyên vật cản', () => {
  it('có vật cản là đá, bụi, đèn đất, rễ', () => {
    expect(GROUND_OBSTACLES.length).toBeGreaterThan(100);
  });

  it('6 con thỏ chạy 2 phút không lần nào chồng lên đá / bụi / rễ', () => {
    const rnds = Array.from({ length: 6 }, (_, i) => mulberry32(100 + i * 17));
    const herd = rnds.map((r) => createBrain(r, GROUND_OBSTACLES));
    for (const b of herd) expect(minClearance(b)).toBeGreaterThanOrEqual(-1e-6);

    const dt = 1 / 60;
    let hops = 0;
    for (let step = 0; step < 60 * 120; step++) {
      herd.forEach((b, i) => {
        stepBrain(b, dt, rnds[i]!, GROUND_OBSTACLES, herd);
        if (b.mode === 'hop') hops++;
        expect(minClearance(b)).toBeGreaterThanOrEqual(-1e-6);
        expect(Math.hypot(b.x, b.z)).toBeLessThan(MAX_RING + 1.5);
      });
    }
    // Thỏ thực sự có chạy nhảy, không đứng im một chỗ
    expect(hops).toBeGreaterThan(60 * 120 * 6 * 0.3);
  });
});
