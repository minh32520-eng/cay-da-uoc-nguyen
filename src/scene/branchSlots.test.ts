import { describe, expect, it } from 'vitest';
import { BRANCH_SLOTS, getSlotById } from './branchSlots';
import { LANTERN_CLEARANCE, lanternCenter, paperCenter, TREE_LAYOUT } from './treeLayout';

describe('BRANCH_SLOTS (001)', () => {
  it('AC-001-02: có đúng 100 slot, ID không trùng', () => {
    expect(BRANCH_SLOTS).toHaveLength(100);
    expect(new Set(BRANCH_SLOTS.map((s) => s.id)).size).toBe(100);
  });

  it('ID theo dạng slot-NNN và tra cứu được', () => {
    for (const s of BRANCH_SLOTS) {
      expect(s.id).toMatch(/^slot-\d{3}$/);
      expect(getSlotById(s.id)).toBe(s);
    }
  });

  it('chia 3 tầng 34/33/33 theo độ cao', () => {
    const count = (t: string) => BRANCH_SLOTS.filter((s) => s.tier === t).length;
    expect([count('low'), count('mid'), count('high')]).toEqual([34, 33, 33]);
    const maxLow = Math.max(...BRANCH_SLOTS.filter((s) => s.tier === 'low').map((s) => s.position[1]));
    const minHigh = Math.min(...BRANCH_SLOTS.filter((s) => s.tier === 'high').map((s) => s.position[1]));
    expect(maxLow).toBeLessThanOrEqual(minHigh);
  });

  it('đèn lồng không che chỗ treo tờ ước nguyện', () => {
    expect(TREE_LAYOUT.lanterns.length).toBeGreaterThanOrEqual(8); // FR-001-07
    for (const l of TREE_LAYOUT.lanterns) {
      const c = lanternCenter(l);
      for (const s of BRANCH_SLOTS) {
        const p = paperCenter(s);
        expect(Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2])).toBeGreaterThanOrEqual(LANTERN_CLEARANCE);
      }
    }
  });

  it('bố cục ổn định giữa các lần chạy (seed cố định)', () => {
    expect(BRANCH_SLOTS[0]?.position.map((v) => Number(v.toFixed(3)))).toMatchSnapshot();
  });
});
