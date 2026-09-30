import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/shared/lib/random';
import { createSantaFlight, FLIGHT_MS, REST_MAX_MS, REST_MIN_MS, santaPosition, stepSantaFlight } from './santaFlight';
import { TREE_LAYOUT } from './treeLayout';

describe('Ông già Noel bay ngang trời (FR-001-20, FR-001-21)', () => {
  it('AC-001-20: mỗi lượt bay 8 s, nghỉ 5–8 s, hướng bay đổi xen kẽ', () => {
    const rnd = mulberry32(1224);
    const f = createSantaFlight(rnd);
    const dt = 1000 / 60;
    const flights: { dir: number; ms: number }[] = [];
    const rests: number[] = [];
    let phase = f.phase;
    let phaseStart = 0;
    let dir = f.dir;
    for (let t = 0; t < 5 * 60_000; t += dt) {
      stepSantaFlight(f, dt, rnd, true);
      if (f.phase !== phase) {
        const len = t + dt - phaseStart;
        if (phase === 'flying') flights.push({ dir, ms: len });
        else rests.push(len);
        phase = f.phase;
        phaseStart = t + dt;
        dir = f.dir;
      }
    }
    expect(flights.length).toBeGreaterThan(15);
    for (const fl of flights) expect(Math.abs(fl.ms - FLIGHT_MS)).toBeLessThanOrEqual(dt + 1);
    // Bỏ khoảng nghỉ đầu tiên (chờ ngắn trước lượt bay đầu)
    for (const r of rests.slice(1)) {
      expect(r).toBeGreaterThanOrEqual(REST_MIN_MS - dt);
      expect(r).toBeLessThanOrEqual(REST_MAX_MS + dt);
    }
    for (let i = 1; i < flights.length; i++) expect(flights[i]!.dir).toBe(-flights[i - 1]!.dir);
    expect(REST_MIN_MS).toBe(5000);
    expect(REST_MAX_MS).toBe(8000);
  });

  it('AC-001-21: xe luôn cao hơn ngôi sao ≥ 2, ở phía sau cây, đi hết từ mép này sang mép kia', () => {
    for (const dir of [1, -1] as const) {
      const xs: number[] = [];
      for (let i = 0; i <= 200; i++) {
        const p = santaPosition(i / 200, dir);
        expect(p.position[1]).toBeGreaterThanOrEqual(TREE_LAYOUT.starY + 2);
        expect(p.position[2]).toBeLessThan(-10);
        xs.push(p.position[0]);
      }
      expect(Math.min(...xs)).toBeLessThan(-30);
      expect(Math.max(...xs)).toBeGreaterThan(30);
      // Đi đúng hướng
      expect(Math.sign(xs[200]! - xs[0]!)).toBe(dir);
    }
  });

  it('AC-001-22: reduced-motion → không bay', () => {
    const rnd = mulberry32(1);
    const f = createSantaFlight(rnd);
    for (let t = 0; t < 30_000; t += 16) {
      stepSantaFlight(f, 16, rnd, false);
      expect(f.phase).toBe('resting');
    }
  });
});
