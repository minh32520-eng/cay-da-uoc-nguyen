import { useEffect, useMemo } from 'react';
import { PAPER_HEX, type Wish } from '@/entities/wish';
import { events } from '@/shared/lib/events';
import { mulberry32 } from '@/shared/lib/random';
import { vi } from '@/shared/i18n/vi';
import { BRANCH_SLOTS } from './branchSlots';
import type { SceneProps } from './sceneProps';
import { TREE_LAYOUT } from './treeLayout';

const W = 800;
const H = 600;
const CX = 400;
const GROUND = 565;
const SY = 54; // px mỗi đơn vị chiều cao
const SX = 95; // px mỗi đơn vị bán kính
const svgY = (y: number) => GROUND - y * SY;

/** Toạ độ 2D của từng slot: dàn đều theo bề ngang mép tầng lá (cùng thứ tự BRANCH_SLOTS). */
const POS = TREE_LAYOUT.slotMeta.map(({ layer, k, n }) => {
  const l = TREE_LAYOUT.layers[layer]!;
  return {
    x: CX + (((k + 0.5) / n) * 2 - 1) * l.radius * SX * 0.92,
    y: svgY(l.y) + 3 + (k % 2) * 5,
  };
});
const SLOT_INDEX = new Map(BRANCH_SLOTS.map((s, i) => [s.id, i]));

/** Đường viền một tầng lá: mặt cong lõm + mép răng cưa rủ xuống. */
function layerPath(li: number): string {
  const l = TREE_LAYOUT.layers[li]!;
  const pts: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const r = -l.radius + (i / steps) * 2 * l.radius;
    const t = 1 - Math.abs(r) / l.radius;
    pts.push(`${(CX + r * SX).toFixed(1)},${svgY(l.y + l.height * t * t).toFixed(1)}`);
  }
  const tips = Math.max(6, Math.round(l.radius * 5));
  for (let i = tips; i >= 0; i--) {
    const x = CX - l.radius * SX + (i / tips) * 2 * l.radius * SX;
    pts.push(`${x.toFixed(1)},${(svgY(l.y) + (i % 2 === 0 ? 9 : 0)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

function snowCapPath(li: number): string {
  const l = TREE_LAYOUT.layers[li]!;
  const seg = (from: number, to: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const r = from + ((to - from) * i) / 8;
      const t = 1 - Math.abs(r) / l.radius;
      pts.push(`${(CX + r * SX).toFixed(1)},${(svgY(l.y + l.height * t * t) + 1).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  };
  return `${seg(-l.radius, -l.radius * 0.45)} ${seg(l.radius * 0.45, l.radius)}`;
}

function starPath(cx: number, cy: number, R: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`;
  });
  return `M${pts.join(' L')} Z`;
}

/** Chế độ 2D dự phòng khi không có WebGL (FR-001-10) — mọi tờ giấy là nút bấm được. */
export function Scene2D({ wishes, onWishClick, pickableSlots, onSlotClick, highlightIds, selectedId, reducedMotion, onBackgroundClick }: SceneProps) {
  useEffect(() => {
    events.emit('scene:ready', { mode: '2d' });
  }, []);

  const flakes = useMemo(() => {
    const rnd = mulberry32(77);
    return Array.from({ length: 60 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1 + rnd() * 2.2, dur: 6 + rnd() * 8, delay: -rnd() * 14 }));
  }, []);

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
        <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 10} stroke="#b91c1c" strokeWidth={1.3} />
        <rect
          x={p.x - (selected ? 8 : 6)}
          y={p.y + 10}
          width={selected ? 16 : 12}
          height={selected ? 23 : 18}
          rx={2}
          fill={PAPER_HEX[w.paperColor]}
          stroke="#00000040"
        />
        <title>{`${w.author}: ${w.content}`}</title>
      </g>
    );
  };

  const layerCount = TREE_LAYOUT.layers.length;
  const top = TREE_LAYOUT.layers[layerCount - 1]!;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="group" aria-label={vi.scene.tree2dLabel} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="moonGlow">
          <stop offset="0%" stopColor="#eef3ff" />
          <stop offset="60%" stopColor="#cfdcff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#cfdcff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1128" />
          <stop offset="100%" stopColor="#1f2c55" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" onClick={onBackgroundClick} />
      <circle cx={130} cy={90} r={80} fill="url(#moonGlow)" />
      <circle cx={130} cy={90} r={38} fill="#eef3ff" />
      {/* Đồi tuyết */}
      <path d={`M0 ${GROUND - 20} Q 200 ${GROUND - 60} 400 ${GROUND - 10} T 800 ${GROUND - 30} V600 H0 Z`} fill="#dfe7f5" />
      <ellipse cx={CX} cy={GROUND + 5} rx={380} ry={30} fill="#f4f7fd" />

      <rect x={CX - 14} y={svgY(TREE_LAYOUT.layers[0]!.y) - 10} width={28} height={GROUND - svgY(TREE_LAYOUT.layers[0]!.y) + 10} fill="#4b3021" />
      {TREE_LAYOUT.layers.map((_, li) => (
        <g key={li}>
          <path d={layerPath(li)} fill={li % 2 ? '#1f5c34' : '#1a5230'} />
          <path d={snowCapPath(li)} stroke="#f3f7ff" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.9} />
        </g>
      ))}
      {/* Dây đèn dọc mép tầng */}
      {TREE_LAYOUT.layers.map((l, li) => {
        const n = Math.round(l.radius * 6);
        return Array.from({ length: n }, (_, k) => (
          <circle
            key={`${li}-${k}`}
            cx={CX + (((k + 0.5) / n) * 2 - 1) * l.radius * SX * 0.85}
            cy={svgY(l.y) - 6}
            r={2.2}
            fill={TREE_LAYOUT.lightColors[(k + li) % TREE_LAYOUT.lightColors.length]}
          />
        ));
      })}
      <path d={starPath(CX, svgY(top.y + top.height) - 12, 20, 8)} fill="#ffd54a" stroke="#ffb300" strokeWidth={1.5} />

      {/* Người tuyết */}
      {[
        [110, 0.9],
        [690, 1],
      ].map(([x, s]) => (
        <g key={x} transform={`translate(${x} ${GROUND - 4}) scale(${s})`}>
          <circle cx={0} cy={-28} r={28} fill="#f7faff" />
          <circle cx={0} cy={-72} r={20} fill="#f7faff" />
          <circle cx={0} cy={-104} r={14} fill="#f7faff" />
          <path d="M-14 -90 H14" stroke="#c0392b" strokeWidth={6} strokeLinecap="round" />
          <circle cx={-5} cy={-107} r={2} fill="#151515" />
          <circle cx={5} cy={-107} r={2} fill="#151515" />
          <path d="M0 -103 L14 -100 L0 -99 Z" fill="#ff7a1a" />
          <rect x={-11} y={-132} width={22} height={16} fill="#1b1b1f" />
          <rect x={-16} y={-118} width={32} height={3} fill="#1b1b1f" />
        </g>
      ))}

      {wishes.map(renderWish)}
      {pickableSlots?.map((s) => {
        const i = SLOT_INDEX.get(s.id);
        if (i === undefined) return null;
        const p = POS[i]!;
        return (
          <circle
            key={s.id}
            cx={p.x}
            cy={p.y + 18}
            r={7}
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

      {/* Tuyết rơi (FR-001-15); reduced-motion thì đứng yên */}
      <g aria-hidden="true" pointerEvents="none">
        {flakes.map((f, i) => (
          <circle
            key={i}
            cx={f.x}
            cy={reducedMotion ? f.y : -10}
            r={f.r}
            fill="#ffffff"
            opacity={0.85}
            className={reducedMotion ? undefined : 'snow-fall'}
            style={reducedMotion ? undefined : { animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
