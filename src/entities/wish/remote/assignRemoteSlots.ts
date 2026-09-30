import { BRANCH_SLOTS } from '@/scene/branchSlots';
import { mulberry32 } from '@/shared/lib/random';
import { MAX_WISHES } from '../constants';
import { pickSlot } from '../slotAllocator';
import type { Wish } from '../types';
import type { RemoteWishRow } from './remoteRepository';

/** Seed 32-bit tất định từ id (FNV-1a). */
function seedOf(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function rowToWish(r: RemoteWishRow, slotId: string): Wish {
  return {
    id: r.id,
    content: r.content,
    author: r.author,
    category: r.category,
    paperColor: r.paper_color,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    slotId,
  };
}

/**
 * Gán slot tất định cho cây chung (FR-007-03): lấy 100 điều ước mới nhất,
 * xét từ cũ đến mới, mỗi điều ước chọn slot trống bằng PRNG có seed là id,
 * ưu tiên tầng thấp. Mọi máy có cùng dữ liệu thấy cùng bố cục; điều ước cũ
 * không đổi slot khi có điều ước mới hơn được thêm vào.
 */
export function assignRemoteSlots(rows: readonly RemoteWishRow[]): Wish[] {
  const newest = [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))
    .slice(0, MAX_WISHES);
  const oldestFirst = newest.reverse();
  const used = new Set<string>();
  const out: Wish[] = [];
  for (const r of oldestFirst) {
    const slot = pickSlot(
      BRANCH_SLOTS.filter((s) => !used.has(s.id)),
      mulberry32(seedOf(r.id)),
    );
    if (!slot) break;
    used.add(slot.id);
    out.push(rowToWish(r, slot.id));
  }
  return out;
}
