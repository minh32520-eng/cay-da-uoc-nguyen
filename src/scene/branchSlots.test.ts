import { describe, expect, it } from 'vitest';
import { BRANCH_SLOTS, getSlotById } from './branchSlots';
import { coneSurfaceY, ornamentCoversPaper, PAPER_HEIGHT, paperCenter, TREE_LAYOUT } from './treeLayout';

describe('BRANCH_SLOTS — cây thông (001)', () => {
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

  it('FR-001-01: cây thông có nhiều tầng lá thu nhỏ dần lên đỉnh', () => {
    const { layers } = TREE_LAYOUT;
    expect(layers.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < layers.length; i++) {
      expect(layers[i]!.y).toBeGreaterThan(layers[i - 1]!.y);
      expect(layers[i]!.radius).toBeLessThan(layers[i - 1]!.radius);
    }
    expect(TREE_LAYOUT.starY).toBeGreaterThan(layers.at(-1)!.y);
  });

  it('AC-001-19: tờ giấy treo ngoài mặt nón tầng lá bên dưới (không bị lá che)', () => {
    for (const s of BRANCH_SLOTS) {
      const [x, , z] = s.position;
      const r = Math.hypot(x, z);
      const bottom = paperCenter(s)[1] - PAPER_HEIGHT / 2;
      for (const layer of TREE_LAYOUT.layers) {
        const surface = coneSurfaceY(layer, r);
        // Nếu tầng lá này có mặt nón tại bán kính đó, đáy tờ giấy phải cao hơn mặt nón
        if (surface !== null && layer.y < s.position[1]) expect(bottom).toBeGreaterThan(surface);
      }
    }
  });

  it('AC-001-18: quả châu không che chỗ treo tờ ước nguyện', () => {
    expect(TREE_LAYOUT.ornaments.length).toBeGreaterThanOrEqual(8); // FR-001-07
    for (const o of TREE_LAYOUT.ornaments) {
      for (const s of BRANCH_SLOTS) expect(ornamentCoversPaper(o, s)).toBe(false);
    }
  });

  it('FR-001-07: có dây đèn quấn quanh cây', () => {
    expect(TREE_LAYOUT.lights.length).toBeGreaterThanOrEqual(60);
  });
});
