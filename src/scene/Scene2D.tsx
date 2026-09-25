import { useEffect, useMemo } from 'react';
import { PAPER_HEX, type Wish } from '@/entities/wish';
import { events } from '@/shared/lib/events';
import { vi } from '@/shared/i18n/vi';
import { BRANCH_SLOTS } from './branchSlots';
import type { SceneProps } from './sceneProps';
import { BRANCH_COUNT, SLOTS_PER_BRANCH } from './treeLayout';

const W = 800;
const H = 600;
const TRUNK_TOP = { x: 400, y: 330 };

/** Toạ độ 2D: 10 cành xoè hình quạt, mỗi cành 10 slot (cùng thứ tự với BRANCH_SLOTS). */
function slot2d(index: number) {
  const branch = Math.floor(index / SLOTS_PER_BRANCH);
  const k = index % SLOTS_PER_BRANCH;
  const phi = Math.PI * (0.06 + (0.88 * branch) / (BRANCH_COUNT - 1));
  const dist = 95 + k * 25;
  const dropY = Math.sin((k / SLOTS_PER_BRANCH) * Math.PI) * -18; // cành hơi cong
  return {
    x: TRUNK_TOP.x - Math.cos(phi) * dist,
    y: TRUNK_TOP.y - 20 - Math.sin(phi) * dist * 0.55 + dropY + (k % 2) * 6,
    branch,
    phi,
  };
}

const POS = BRANCH_SLOTS.map((_, i) => slot2d(i));
const SLOT_INDEX = new Map(BRANCH_SLOTS.map((s, i) => [s.id, i]));

/** Chế độ 2D dự phòng khi không có WebGL (FR-001-10) — mọi tờ giấy là nút bấm được. */
export function Scene2D({ wishes, onWishClick, pickableSlots, onSlotClick, highlightIds, selectedId, reducedMotion, onBackgroundClick }: SceneProps) {
  useEffect(() => {
    events.emit('scene:ready', { mode: '2d' });
  }, []);

  const branches = useMemo(
    () =>
      Array.from({ length: BRANCH_COUNT }, (_, b) => {
        const end = POS[b * SLOTS_PER_BRANCH + SLOTS_PER_BRANCH - 1]!;
        return { x1: TRUNK_TOP.x, y1: TRUNK_TOP.y, x2: end.x + (end.x - TRUNK_TOP.x) * 0.08, y2: end.y - 6 };
      }),
    [],
  );

  const activate = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  const renderWish = (w: Wish) => {
    const i = SLOT_INDEX.get(w.slotId);
    if (i === undefined) return null;
    const p = POS[i]!;
    const dim = (highlightIds && !highlightIds.has(w.id)) || (selectedId && selectedId !== w.id);
    const selected = selectedId === w.id;
    return (
      <g
        key={w.id}
        role="button"
        tabIndex={0}
        aria-label={vi.view.itemLabel(w.author, w.content)}
        className={`cursor-pointer outline-none focus-visible:[&>rect]:stroke-amber-200 focus-visible:[&>rect]:stroke-[3px] ${reducedMotion ? '' : 'paper-sway'}`}
        style={{ transformOrigin: `${p.x}px ${p.y}px`, animationDelay: `${(i % 7) * -0.4}s` }}
        opacity={dim ? 0.3 : 1}
        onClick={() => onWishClick?.(w.id)}
        onKeyDown={(e) => activate(e, () => onWishClick?.(w.id))}
      >
        <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 14} stroke="#b91c1c" strokeWidth={1.5} />
        <rect
          x={p.x - (selected ? 9 : 7)}
          y={p.y + 14}
          width={selected ? 18 : 14}
          height={selected ? 26 : 21}
          rx={2}
          fill={PAPER_HEX[w.paperColor]}
          stroke="#00000040"
        />
        <title>{`${w.author}: ${w.content}`}</title>
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="group" aria-label={vi.scene.tree2dLabel} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="moonGlow">
          <stop offset="0%" stopColor="#fff6cf" />
          <stop offset="60%" stopColor="#ffe69a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffe69a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#070b1f" onClick={onBackgroundClick} />
      <circle cx={660} cy={90} r={90} fill="url(#moonGlow)" />
      <circle cx={660} cy={90} r={44} fill="#fff3c4" />
      <ellipse cx={400} cy={575} rx={380} ry={40} fill="#13261a" />
      {/* Thân & rễ */}
      <path d="M360 580 C 370 480, 350 400, 385 330 L 415 330 C 450 400, 430 480, 440 580 Z" fill="#4a3120" />
      <path d="M372 580 C 330 560, 300 575, 280 585 M 428 580 C 470 560, 500 575, 520 585" stroke="#4a3120" strokeWidth={10} fill="none" />
      {branches.map((b, i) => (
        <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#4a3120" strokeWidth={9 - (i % 3)} strokeLinecap="round" />
      ))}
      {/* Rễ phụ buông */}
      {branches.map((b, i) => {
        const x = b.x1 + (b.x2 - b.x1) * 0.6;
        const y = b.y1 + (b.y2 - b.y1) * 0.6;
        return <line key={`r${i}`} x1={x} y1={y} x2={x + 2} y2={570} stroke="#5a3d27" strokeWidth={1.5} opacity={0.7} />;
      })}
      {/* Tán lá phía trên cành */}
      {branches.map((b, i) => (
        <g key={`c${i}`} fill={i % 2 ? '#1c4d2a' : '#15401f'}>
          <circle cx={b.x1 + (b.x2 - b.x1) * 0.45} cy={b.y1 + (b.y2 - b.y1) * 0.45 - 55} r={58} />
          <circle cx={b.x1 + (b.x2 - b.x1) * 0.85} cy={b.y1 + (b.y2 - b.y1) * 0.85 - 45} r={48} />
        </g>
      ))}
      <circle cx={400} cy={170} r={95} fill="#1a4726" />
      {/* Đèn lồng */}
      {branches.filter((_, i) => i % 2 === 0).map((b, i) => {
        const x = b.x1 + (b.x2 - b.x1) * 0.7;
        const y = b.y1 + (b.y2 - b.y1) * 0.7;
        return (
          <g key={`l${i}`}>
            <line x1={x} y1={y} x2={x} y2={y + 26} stroke="#3b2a1a" />
            <ellipse cx={x} cy={y + 38} rx={10} ry={13} fill="#e63946" />
            <ellipse cx={x} cy={y + 38} rx={16} ry={18} fill="#ff9a3c" opacity={0.25} />
          </g>
        );
      })}
      {wishes.map(renderWish)}
      {pickableSlots?.map((s) => {
        const i = SLOT_INDEX.get(s.id);
        if (i === undefined) return null;
        const p = POS[i]!;
        return (
          <circle
            key={s.id}
            cx={p.x}
            cy={p.y + 22}
            r={8}
            fill="#fde68a"
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={vi.scene.freeSlot(s.id)}
            onClick={() => onSlotClick?.(s.id)}
            onKeyDown={(e) => activate(e, () => onSlotClick?.(s.id))}
          />
        );
      })}
    </svg>
  );
}
