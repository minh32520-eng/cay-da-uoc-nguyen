import { mulberry32 } from '@/shared/lib/random';
import type { BranchSlot, Vec3 } from './types';

/**
 * Bố cục cây đa sinh theo seed cố định — cảnh 3D, chế độ 2D và BRANCH_SLOTS
 * cùng dùng một nguồn nên vị trí slot luôn khớp với cành.
 */
export interface Branch {
  angle: number;
  start: Vec3;
  end: Vec3;
  radiusStart: number;
  radiusEnd: number;
}

export interface CanopyBlob {
  position: Vec3;
  radius: number;
  shade: number; // 0..1
}

export interface AerialRoot {
  top: Vec3;
  radius: number;
}

export interface LanternAnchor {
  /** Điểm buộc dây trên tán. */
  anchor: Vec3;
  /** Độ dài dây tới đỉnh đèn. */
  drop: number;
  kind: 'round' | 'star';
}

export interface TreeLayout {
  branches: Branch[];
  twigs: Branch[];
  canopy: CanopyBlob[];
  roots: AerialRoot[];
  slots: BranchSlot[];
  lanterns: LanternAnchor[];
}

export const BRANCH_COUNT = 10;
export const SLOTS_PER_BRANCH = 10;
export const PAPER_HANG_LENGTH = 0.28;
export const PAPER_WIDTH = 0.3;
export const PAPER_HEIGHT = 0.44;
export const LANTERN_BODY_OFFSET = 0.3; // từ đỉnh đèn tới tâm thân đèn
/** Khoảng cách tối thiểu giữa tâm đèn lồng và tâm tờ giấy để không che nhau. */
export const LANTERN_CLEARANCE = 1.0;

export function paperCenter(slot: Pick<BranchSlot, 'position'>): Vec3 {
  return [slot.position[0], slot.position[1] - PAPER_HANG_LENGTH - PAPER_HEIGHT / 2, slot.position[2]];
}

export function lanternCenter(l: LanternAnchor): Vec3 {
  return [l.anchor[0], l.anchor[1] - l.drop - LANTERN_BODY_OFFSET, l.anchor[2]];
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Đèn lồng treo ở khe giữa hai cành (không cùng cành với slot),
 * lùi dần ra ngoài cho tới khi cách mọi tờ giấy ≥ LANTERN_CLEARANCE.
 */
function placeLanterns(branches: Branch[], slots: Omit<BranchSlot, 'id' | 'tier'>[]): LanternAnchor[] {
  const centers = slots.map(paperCenter);
  const out: LanternAnchor[] = [];
  for (let i = 0; i < branches.length; i++) {
    const a = branches[i]!;
    const b = branches[(i + 1) % branches.length]!;
    let gap = b.angle - a.angle;
    if (gap < 0) gap += Math.PI * 2;
    const angle = a.angle + gap / 2;
    const reachA = Math.hypot(a.end[0], a.end[2]);
    const reachB = Math.hypot(b.end[0], b.end[2]);
    const baseY = (a.end[1] + b.end[1]) / 2 + 0.55;
    const drop = 0.35 + (i % 3) * 0.12;
    let r = Math.min(reachA, reachB) * 0.8;
    let candidate: LanternAnchor;
    for (;;) {
      candidate = { anchor: [Math.cos(angle) * r, baseY, Math.sin(angle) * r], drop, kind: i % 3 === 1 ? 'star' : 'round' };
      const c = lanternCenter(candidate);
      if (centers.every((p) => dist(p, c) >= LANTERN_CLEARANCE) || r > 8) break;
      r += 0.15;
    }
    out.push(candidate);
  }
  return out;
}

export function pointOnBranch(b: Branch, t: number): Vec3 {
  // Cành cong nhẹ lên ở giữa
  const arch = Math.sin(t * Math.PI) * 0.35;
  return [
    b.start[0] + (b.end[0] - b.start[0]) * t,
    b.start[1] + (b.end[1] - b.start[1]) * t + arch,
    b.start[2] + (b.end[2] - b.start[2]) * t,
  ];
}

function buildLayout(): TreeLayout {
  const rnd = mulberry32(20260925);
  const branches: Branch[] = [];
  const twigs: Branch[] = [];
  const canopy: CanopyBlob[] = [];
  const roots: AerialRoot[] = [];
  const rawSlots: Omit<BranchSlot, 'id' | 'tier'>[] = [];

  for (let i = 0; i < BRANCH_COUNT; i++) {
    const angle = (i / BRANCH_COUNT) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
    const startH = 2.1 + rnd() * 0.8;
    const reach = 3.7 + rnd() * 1.3;
    const endH = 2.9 + rnd() * 1.6;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const b: Branch = {
      angle,
      start: [c * 0.4, startH, s * 0.4],
      end: [c * reach, endH, s * reach],
      radiusStart: 0.24,
      radiusEnd: 0.07,
    };
    branches.push(b);

    // Nhánh con vươn lên để đỡ tán lá
    for (const t of [0.45, 0.8]) {
      const p = pointOnBranch(b, t);
      const up = 1.0 + rnd() * 0.6;
      const side = (rnd() - 0.5) * 0.8;
      twigs.push({
        angle,
        start: p,
        end: [p[0] + c * 0.5 - s * side, p[1] + up, p[2] + s * 0.5 + c * side],
        radiusStart: 0.1,
        radiusEnd: 0.04,
      });
    }

    // Tán lá nằm phía trên cành để tờ giấy bên dưới lộ ra
    for (const t of [0.35, 0.65, 0.95]) {
      const p = pointOnBranch(b, t);
      canopy.push({
        position: [p[0] + (rnd() - 0.5) * 0.6, p[1] + 1.25 + rnd() * 0.6, p[2] + (rnd() - 0.5) * 0.6],
        radius: 1.05 + rnd() * 0.55,
        shade: rnd(),
      });
    }

    // Rễ phụ buông thõng — đặc trưng của cây đa
    // t được "nắn" vào khe giữa hai slot liền kề để rễ không đè lên tờ giấy
    const snap = (t: number) => 0.336 + 0.072 * Math.round((t - 0.336) / 0.072);
    for (const t of [0.5 + rnd() * 0.1, 0.78 + rnd() * 0.12]) {
      roots.push({ top: pointOnBranch(b, snap(t)), radius: 0.025 + rnd() * 0.03 });
    }

    // 10 slot dọc cành, so le hai bên để không chồng nhau
    const perp: Vec3 = [-s, 0, c];
    for (let k = 0; k < SLOTS_PER_BRANCH; k++) {
      const t = 0.3 + k * 0.072;
      const p = pointOnBranch(b, t);
      const side = (k % 2 === 0 ? 1 : -1) * 0.13;
      rawSlots.push({
        position: [p[0] + perp[0] * side, p[1] - 0.05, p[2] + perp[2] * side],
        rotationY: Math.PI / 2 - angle,
      });
    }
  }

  // Tán trung tâm
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 1.8;
    canopy.push({
      position: [Math.cos(a) * r, 4.9 + rnd() * 1.2, Math.sin(a) * r],
      radius: 1.4 + rnd() * 0.6,
      shade: rnd(),
    });
  }

  // Tầng theo độ cao: 34 thấp, 33 giữa, 33 cao
  const byHeight = rawSlots
    .map((s, i) => ({ y: s.position[1], i }))
    .sort((a, b) => a.y - b.y);
  const tiers: BranchSlot['tier'][] = new Array(rawSlots.length);
  byHeight.forEach(({ i }, rank) => {
    tiers[i] = rank < 34 ? 'low' : rank < 67 ? 'mid' : 'high';
  });

  const slots: BranchSlot[] = rawSlots.map((s, i) => ({
    ...s,
    id: `slot-${String(i + 1).padStart(3, '0')}`,
    tier: tiers[i] ?? 'mid',
  }));

  return { branches, twigs, canopy, roots, slots, lanterns: placeLanterns(branches, rawSlots) };
}

export const TREE_LAYOUT: TreeLayout = buildLayout();
