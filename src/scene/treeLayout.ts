import { mulberry32 } from '@/shared/lib/random';
import type { BranchSlot, Vec3 } from './types';

/**
 * Bố cục cây thông sinh tất định — cảnh 3D, chế độ 2D và BRANCH_SLOTS cùng dùng
 * một nguồn nên vị trí chỗ treo luôn khớp với tầng lá.
 *
 * Mỗi tầng lá là một "váy" hình nón có mặt cong lõm: y = y0 + H·(1 − r/R)².
 * Mép tầng gần như nằm ngang nên tờ giấy treo dưới mép tầng trên
 * luôn nằm ngoài mặt nón của tầng dưới (AC-001-19).
 */

export interface PineLayer {
  /** Độ cao mép dưới của tầng. */
  y: number;
  /** Bán kính mép. */
  radius: number;
  /** Chiều cao từ mép tới chóp. */
  height: number;
}

export interface Ornament {
  position: Vec3;
  color: string;
  size: number;
}

export interface SlotMeta {
  layer: number;
  k: number;
  n: number;
}

export interface TreeLayout {
  layers: PineLayer[];
  slots: BranchSlot[];
  slotMeta: SlotMeta[];
  ornaments: Ornament[];
  lights: Vec3[];
  lightColors: string[];
  starY: number;
  trunk: { radius: number; top: number };
}

export const PAPER_HANG_LENGTH = 0.2;
export const PAPER_WIDTH = 0.3;
export const PAPER_HEIGHT = 0.44;

const LAYER_COUNT = 7;
const LAYER_GAP = 0.95;
const LAYER_HEIGHT = 1.9;
const BASE_Y = 1.3;
const BASE_RADIUS = 3.4;
const RADIUS_STEP = 0.45;
/** Số chỗ treo mỗi tầng (tỉ lệ với chu vi mép), tổng = 100. */
const SLOTS_PER_LAYER = [24, 21, 18, 15, 11, 7, 4];
const SLOT_OUTSET = 0.06;

/** Độ cao mặt nón của một tầng tại bán kính r; null nếu r nằm ngoài mép. */
export function coneSurfaceY(layer: PineLayer, r: number): number | null {
  if (r > layer.radius) return null;
  const t = 1 - r / layer.radius;
  return layer.y + layer.height * t * t;
}

export function paperCenter(slot: Pick<BranchSlot, 'position'>): Vec3 {
  return [slot.position[0], slot.position[1] - PAPER_HANG_LENGTH - PAPER_HEIGHT / 2, slot.position[2]];
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Quả châu che tờ giấy khi nhìn từ ngoài vào (FR-001-19): chồng lấn theo phương ngang
 * (cung tròn quanh thân) VÀ theo độ cao (cả dây treo), VÀ không nằm hẳn phía sau tờ giấy.
 */
export function ornamentCoversPaper(o: Ornament, slot: Pick<BranchSlot, 'position'>): boolean {
  const [px, py, pz] = slot.position;
  const [ox, oy, oz] = o.position;
  const rp = Math.hypot(px, pz);
  const ro = Math.hypot(ox, oz);
  let dth = Math.atan2(oz, ox) - Math.atan2(pz, px);
  dth = Math.atan2(Math.sin(dth), Math.cos(dth));
  const horizontal = Math.abs(dth) * rp < PAPER_WIDTH / 2 + o.size + 0.05;
  const bottom = py - PAPER_HANG_LENGTH - PAPER_HEIGHT;
  const vertical = oy + o.size > bottom - 0.05 && oy - o.size < py + 0.05;
  const inFront = ro + o.size > rp - 0.08;
  const touching = dist(o.position, paperCenter(slot)) < o.size + PAPER_HEIGHT / 2 + 0.05;
  return (horizontal && vertical && inFront) || touching;
}

const ORNAMENT_COLORS = ['#d7263d', '#f2b134', '#2e86de', '#c0c0d0', '#8e44ad', '#e84393', '#1abc9c'];
const LIGHT_COLORS = ['#ffd166', '#ff6b6b', '#4dabf7', '#69db7c', '#f783ac'];

function build(): TreeLayout {
  const rnd = mulberry32(20261225);
  const layers: PineLayer[] = Array.from({ length: LAYER_COUNT }, (_, i) => ({
    y: BASE_Y + LAYER_GAP * i,
    radius: BASE_RADIUS - RADIUS_STEP * i,
    height: LAYER_HEIGHT,
  }));

  // Chỗ treo: đều quanh mép mỗi tầng, lệch pha giữa các tầng để không thẳng hàng
  const rawSlots: Omit<BranchSlot, 'id' | 'tier'>[] = [];
  const slotMeta: SlotMeta[] = [];
  layers.forEach((layer, li) => {
    const n = SLOTS_PER_LAYER[li]!;
    const phase = li * 0.61;
    for (let k = 0; k < n; k++) {
      const a = phase + (k / n) * Math.PI * 2;
      const r = layer.radius + SLOT_OUTSET;
      rawSlots.push({
        position: [Math.cos(a) * r, layer.y + 0.02, Math.sin(a) * r],
        rotationY: Math.PI / 2 - a,
      });
      slotMeta.push({ layer: li, k, n });
    }
  });

  // Tầng theo độ cao: 34 thấp, 33 giữa, 33 cao
  const order = rawSlots.map((s, i) => ({ y: s.position[1], i })).sort((a, b) => a.y - b.y || a.i - b.i);
  const tiers: BranchSlot['tier'][] = new Array(rawSlots.length);
  order.forEach(({ i }, rank) => {
    tiers[i] = rank < 34 ? 'low' : rank < 67 ? 'mid' : 'high';
  });
  const slots: BranchSlot[] = rawSlots.map((s, i) => ({
    ...s,
    id: `slot-${String(i + 1).padStart(3, '0')}`,
    tier: tiers[i] ?? 'mid',
  }));

  // Quả châu: ngồi trên vùng ngoài của mỗi tầng lá, chỉ nhận vị trí không che tờ giấy nào
  const ornaments: Ornament[] = [];
  for (let li = 0; li < LAYER_COUNT && ornaments.length < 18; li++) {
    const layer = layers[li]!;
    const tries = 600;
    let placedHere = 0;
    for (let t = 0; t < tries && placedHere < 3; t++) {
      const a = rnd() * Math.PI * 2;
      // Vùng ngoài của tầng (không bị tầng trên che), ngồi trên mặt lá
      const r = layer.radius * (0.7 + rnd() * 0.22);
      const size = 0.13 + rnd() * 0.05;
      const y = coneSurfaceY(layer, r)! + size + 0.04; // tâm quả châu, đáy chạm mặt lá
      const candidate: Ornament = {
        position: [Math.cos(a) * r, y, Math.sin(a) * r],
        color: ORNAMENT_COLORS[ornaments.length % ORNAMENT_COLORS.length]!,
        size,
      };
      if (slots.some((s) => ornamentCoversPaper(candidate, s))) continue;
      if (!ornaments.every((o) => dist(o.position, candidate.position) >= 0.7)) continue;
      ornaments.push(candidate);
      placedHere++;
    }
  }

  // Dây đèn chạy dọc mép mỗi tầng, võng nhẹ giữa các điểm buộc
  const lights: Vec3[] = [];
  const lightColors: string[] = [];
  layers.forEach((layer, li) => {
    const n = Math.round(layer.radius * 14);
    for (let k = 0; k < n; k++) {
      const a = li * 0.3 + (k / n) * Math.PI * 2;
      const r = layer.radius * 0.93;
      const sag = Math.abs(Math.sin((k / n) * Math.PI * 8)) * 0.05;
      lights.push([Math.cos(a) * r, coneSurfaceY(layer, r)! + 0.06 - sag, Math.sin(a) * r]);
      lightColors.push(LIGHT_COLORS[(k + li) % LIGHT_COLORS.length]!);
    }
  });

  const top = layers[LAYER_COUNT - 1]!;
  return {
    layers,
    slots,
    slotMeta,
    ornaments,
    lights,
    lightColors,
    starY: top.y + top.height + 0.3,
    trunk: { radius: 0.32, top: top.y + top.height * 0.6 },
  };
}

export const TREE_LAYOUT: TreeLayout = build();
