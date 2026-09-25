import type { BranchSlot } from '@/scene/types';

const TIER_ORDER: BranchSlot['tier'][] = ['low', 'mid', 'high'];

/** Chọn ngẫu nhiên slot trống, ưu tiên tầng thấp → giữa → cao (FR-003-03). */
export function pickSlot(
  free: readonly BranchSlot[],
  rnd: () => number = Math.random,
): BranchSlot | null {
  for (const tier of TIER_ORDER) {
    const inTier = free.filter((s) => s.tier === tier);
    if (inTier.length > 0) return inTier[Math.floor(rnd() * inTier.length)] ?? inTier[0] ?? null;
  }
  return null;
}
