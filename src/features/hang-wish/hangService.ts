import {
  remoteWishes,
  useWishStore,
  type HangError,
  type HangOptions,
  type HangResult,
  type RemoteError,
  type Wish,
  type WishDraft,
} from '@/entities/wish';
import { cameraControls } from '@/scene/sceneStore';
import { events } from '@/shared/lib/events';
import { prefersReducedMotion } from '@/shared/lib/useReducedMotion';
import { vi } from '@/shared/i18n/vi';
import { toast } from '@/shared/ui/toast';

export const HANG_DURATION_MS = 2200; // ≤ 2.5 s (FR-003-05)
export const HANG_DURATION_REDUCED_MS = 200; // FR-003-13

const ERROR_TEXT: Record<HangError, string> = {
  TREE_FULL: vi.hang.treeFull,
  SLOT_TAKEN: vi.hang.slotTaken,
  INVALID_DRAFT: vi.compose.errEmpty,
  STORAGE_FAILED: vi.hang.storageFailed,
};

/** Thông báo cho lỗi server ở chế độ remote (007 §7). */
const REMOTE_ERROR_TEXT: Record<RemoteError, string> = {
  QUOTA_EXCEEDED: vi.remote.quotaExceeded,
  NETWORK: vi.remote.network,
  SERVER: vi.remote.network,
  FORBIDDEN: vi.remote.forbidden,
  NOT_FOUND: vi.view.gone,
  GONE: vi.remote.gone,
  PROFANITY: vi.compose.errProfanity,
  VALIDATION: vi.compose.errEmpty,
  BAD_RESPONSE: vi.remote.badResponse,
};

export function remoteErrorText(error: RemoteError): string {
  return REMOTE_ERROR_TEXT[error];
}

const hangDuration = () => (prefersReducedMotion() ? HANG_DURATION_REDUCED_MS : HANG_DURATION_MS);

/** Bay camera tới tờ giấy, kết thúc animation và báo thành công. */
function celebrate(wish: Wish, durationMs: number, successMessage?: string) {
  cameraControls.flyTo(wish.slotId, Math.min(900, durationMs));
  window.setTimeout(() => {
    const store = useWishStore.getState();
    if (store.animation?.wishId === wish.id) store.finishAnimation();
    toast(successMessage ?? vi.hang.success, { tone: 'success', durationMs: 4000 });
    events.emit('wish:hung', { wish });
  }, durationMs);
}

/**
 * Treo một bản nháp lên cây ở chế độ local: gán slot, bay camera, chạy animation,
 * báo toast khi xong (FR-003-01..07).
 */
export function hangFromDraft(
  draft: WishDraft,
  opts: Omit<HangOptions, 'durationMs'> & { successMessage?: string } = {},
): HangResult {
  events.emit('wish:submitted', { draft });
  const durationMs = hangDuration();
  const result = useWishStore.getState().hangWish(draft, { ...opts, durationMs });

  if (!result.ok) {
    events.emit('wish:hang-failed', { error: result.error });
    toast(ERROR_TEXT[result.error], { tone: 'error' });
    return result;
  }
  if (!result.persisted) toast(vi.hang.storageFailed, { tone: 'error', durationMs: 8000 });
  celebrate(result.wish, durationMs, opts.successMessage);
  return result;
}

/**
 * Treo điều ước ở chế độ hiện tại: remote → gửi server (007), local → như trên.
 * Trả true nếu đã treo thành công (để form xoá bản nháp).
 */
export async function hangWishAnyMode(
  draft: WishDraft,
  opts: Omit<HangOptions, 'durationMs'> & { successMessage?: string } = {},
): Promise<{ ok: true; wish: Wish } | { ok: false }> {
  if (!remoteWishes.enabled) {
    const r = hangFromDraft(draft, opts);
    return r.ok ? { ok: true, wish: r.wish } : { ok: false };
  }
  events.emit('wish:submitted', { draft });
  const durationMs = hangDuration();
  const r = await remoteWishes.create(draft, opts.source ?? 'local', durationMs);
  if (!r.ok) {
    toast(REMOTE_ERROR_TEXT[r.error], { tone: 'error', durationMs: 6000 });
    return { ok: false };
  }
  celebrate(r.value, durationMs, opts.successMessage);
  return { ok: true, wish: r.value };
}

export function hangErrorText(error: HangError): string {
  return ERROR_TEXT[error];
}
