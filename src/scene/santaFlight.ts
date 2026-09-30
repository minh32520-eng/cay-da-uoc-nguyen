import type { Vec3 } from './types';

/**
 * Lịch bay & quỹ đạo của xe trượt tuyết ông già Noel (FR-001-20, FR-001-21, NFR-001-11).
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

const X_SPAN = 54;

/** Vị trí + góc chúc/nghiêng của xe theo tiến độ p (0..1). */
export function santaPosition(p: number, dir: 1 | -1): { position: Vec3; pitch: number; roll: number } {
  const x = (p * 2 - 1) * X_SPAN * dir;
  // Vòng cung lên cao ở giữa trời, nhấp nhô nhẹ như đang phi
  const y = 11.6 + Math.sin(p * Math.PI) * 0.9 + Math.sin(p * Math.PI * 7) * 0.25;
  const z = -40 + Math.sin(p * Math.PI) * 4;
  const dy = Math.cos(p * Math.PI) * Math.PI * 0.9 + Math.cos(p * Math.PI * 7) * Math.PI * 7 * 0.25;
  const pitch = Math.atan2(dy, X_SPAN * 2) * 1.5;
  const roll = Math.sin(p * Math.PI * 2) * 0.12 * dir;
  return { position: [x, y, z], pitch, roll };
}
