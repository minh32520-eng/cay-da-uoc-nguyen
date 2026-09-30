import { MOON_POSITION, VIEW_ORIGIN } from './sky';
import type { Vec3 } from './types';

/**
 * Lịch bay & quỹ đạo của hình bóng ông già Noel (FR-001-20, FR-001-21, NFR-001-11).
 * Logic thuần: một lượt bay 8 s, nghỉ ngẫu nhiên 5–8 s, hướng bay đổi xen kẽ.
 */

export const FLIGHT_MS = 8000;
export const REST_MIN_MS = 5000;
export const REST_MAX_MS = 8000;
/** Chờ ngắn sau khi cảnh vừa tải rồi mới bay lượt đầu. */
const FIRST_WAIT_MS = 2500;

export interface SantaFlight {
  phase: 'flying' | 'resting';
  /** ms còn lại của pha hiện tại */
  remaining: number;
  /** 1 = trái → phải, -1 = phải → trái */
  dir: 1 | -1;
  /** 0..1 tiến độ lượt bay */
  progress: number;
}

export function createSantaFlight(rnd: () => number): SantaFlight {
  return { phase: 'resting', remaining: FIRST_WAIT_MS, dir: rnd() < 0.5 ? 1 : -1, progress: 0 };
}

export function stepSantaFlight(f: SantaFlight, dtMs: number, rnd: () => number, animate: boolean): void {
  if (!animate) {
    // reduced-motion: không bay (FR-001-09)
    f.phase = 'resting';
    f.progress = 0;
    return;
  }
  f.remaining -= dtMs;
  if (f.phase === 'flying') {
    f.progress = Math.min(1, 1 - f.remaining / FLIGHT_MS);
    if (f.remaining <= 0) {
      f.phase = 'resting';
      f.remaining = REST_MIN_MS + rnd() * (REST_MAX_MS - REST_MIN_MS);
      f.progress = 0;
    }
  } else if (f.remaining <= 0) {
    f.phase = 'flying';
    f.remaining = FLIGHT_MS;
    f.dir = f.dir === 1 ? -1 : 1;
    f.progress = 0;
  }
}

/** Độ sâu (z) của đường bay: phía sau cây, trước mặt trăng. */
export const FLIGHT_Z = -36;
const HALF_SPAN = 72;

/** Điểm mà tia nhìn từ camera tới tâm trăng cắt mặt phẳng z = FLIGHT_Z. */
export const MOON_CROSSING: Vec3 = (() => {
  const t = (FLIGHT_Z - VIEW_ORIGIN[2]) / (MOON_POSITION[2] - VIEW_ORIGIN[2]);
  return [
    VIEW_ORIGIN[0] + (MOON_POSITION[0] - VIEW_ORIGIN[0]) * t,
    VIEW_ORIGIN[1] + (MOON_POSITION[1] - VIEW_ORIGIN[1]) * t,
    FLIGHT_Z,
  ];
})();

/**
 * Vị trí + góc chúc/nghiêng theo tiến độ p (0..1) trong khung nhìn gốc.
 * Giữa lượt bay (p = 0.5) hình bóng đi ngang qua tâm mặt trăng.
 */
export function santaPosition(p: number, dir: 1 | -1): { position: Vec3; pitch: number; roll: number } {
  const [cx, cy] = MOON_CROSSING;
  const x = cx + (p * 2 - 1) * HALF_SPAN * dir;
  // Vòng cung nhẹ, đỉnh đúng tâm trăng, nhấp nhô như đang phi
  const y = cy + Math.sin(p * Math.PI) * 0.8 - 0.8 + Math.sin(p * Math.PI * 7) * 0.2;
  const dy = Math.cos(p * Math.PI) * Math.PI * 0.8 + Math.cos(p * Math.PI * 7) * Math.PI * 7 * 0.2;
  const pitch = Math.atan2(dy, HALF_SPAN * 2) * 1.5;
  const roll = Math.sin(p * Math.PI * 2) * 0.1 * dir;
  return { position: [x, y, FLIGHT_Z], pitch, roll };
}
