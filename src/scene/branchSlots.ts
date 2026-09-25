import { TREE_LAYOUT } from './treeLayout';
import type { BranchSlot } from './types';

/** 100 slot treo cố định (FR-001-02). */
export const BRANCH_SLOTS: readonly BranchSlot[] = Object.freeze(TREE_LAYOUT.slots);

const byId = new Map(BRANCH_SLOTS.map((s) => [s.id, s]));

export function getSlotById(id: string): BranchSlot | undefined {
  return byId.get(id);
}
