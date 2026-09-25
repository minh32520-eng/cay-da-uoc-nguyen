import { useWishStore, type HangError, type HangOptions, type HangResult, type WishDraft } from '@/entities/wish';
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

/**
 * Treo một bản nháp lên cây: gán slot, bay camera, chạy animation,
 * báo toast khi xong (FR-003-01..07).
 */
export function hangFromDraft(
  draft: WishDraft,
  opts: Omit<HangOptions, 'durationMs'> & { successMessage?: string } = {},
): HangResult {
  events.emit('wish:submitted', { draft });
  const durationMs = prefersReducedMotion() ? HANG_DURATION_REDUCED_MS : HANG_DURATION_MS;
  const result = useWishStore.getState().hangWish(draft, { ...opts, durationMs });

  if (!result.ok) {
    events.emit('wish:hang-failed', { error: result.error });
    toast(ERROR_TEXT[result.error], { tone: 'error' });
    return result;
  }

  cameraControls.flyTo(result.wish.slotId, Math.min(900, durationMs));
  if (!result.persisted) toast(vi.hang.storageFailed, { tone: 'error', durationMs: 8000 });

  window.setTimeout(() => {
    const store = useWishStore.getState();
    if (store.animation?.wishId === result.wish.id) store.finishAnimation();
    toast(opts.successMessage ?? vi.hang.success, { tone: 'success', durationMs: 4000 });
    events.emit('wish:hung', { wish: result.wish });
  }, durationMs);

  return result;
}

export function hangErrorText(error: HangError): string {
  return ERROR_TEXT[error];
}
