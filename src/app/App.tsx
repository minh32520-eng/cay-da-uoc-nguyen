import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  freeSlotsOf,
  MAX_WISHES,
  remoteWishes,
  selectIsFull,
  useWishStore,
  type Wish,
  type WishDraft,
} from '@/entities/wish';
import { hangFromDraft, hangWishAnyMode, remoteErrorText } from '@/features/hang-wish';
import { useWishPersistence } from '@/features/hang-wish';
import { BackupPanel, WishActions } from '@/features/manage-wish';
import { IncomingWishOverlay, ShareButton, useIncomingSharedWish } from '@/features/share-wish';
import {
  getAdjacentWishId,
  useVisibleWishes,
  useWishViewStore,
  WishDetailCard,
  WishListDrawer,
} from '@/features/view-wish';
import { draftStorage, WishComposer, type SubmitOptions } from '@/features/write-wish';
import { BanyanScene, SceneControls } from '@/scene/BanyanScene';
import { cameraControls } from '@/scene/sceneStore';
import { events } from '@/shared/lib/events';
import { useReducedMotion } from '@/shared/lib/useReducedMotion';
import { vi } from '@/shared/i18n/vi';
import { Toaster } from '@/shared/ui/Toaster';
import { BrandMark, BrushIcon, ChestIcon, ScrollIcon } from '@/shared/ui/icons';
import { toast } from '@/shared/ui/toast';

type ComposerState = { open: false } | { open: true; mode: 'create' } | { open: true; mode: 'edit'; wish: Wish };

export function App() {
  useWishPersistence();
  useIncomingSharedWish();

  const wishes = useWishStore((s) => s.wishes);
  const older = useWishStore((s) => s.older);
  const quota = useWishStore((s) => s.quota);
  const remote = remoteWishes.enabled;
  // Cây chung luôn hiển thị 100 điều ước mới nhất nên không bao giờ "đầy" (007 ghi đè FR-003-12)
  const localFull = useWishStore(selectIsFull);
  const isFull = !remote && localFull;
  const selectedId = useWishViewStore((s) => s.selectedWishId);
  const select = useWishViewStore((s) => s.select);
  const openDrawer = useWishViewStore((s) => s.openDrawer);
  const closeDrawer = useWishViewStore((s) => s.closeDrawer);
  const { visibleWishes, matchedIds } = useVisibleWishes();
  const reducedMotion = useReducedMotion();

  const [composer, setComposer] = useState<ComposerState>({ open: false });
  const [pickDraft, setPickDraft] = useState<WishDraft | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);

  const selectedWish = useMemo(
    () => wishes.find((w) => w.id === selectedId) ?? older.find((w) => w.id === selectedId) ?? null,
    [wishes, older, selectedId],
  );

  // Ước nguyện đang xem bị gỡ ở tab khác (ERR-004-01)
  useEffect(() => {
    if (selectedId && !selectedWish) {
      const t = window.setTimeout(() => {
        const st = useWishStore.getState();
        if (!st.wishes.some((w) => w.id === selectedId) && !st.older.some((w) => w.id === selectedId)) {
          select(null);
          if (useWishStore.getState().falling.every((f) => f.wish.id !== selectedId)) toast(vi.view.gone);
        }
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [selectedId, selectedWish, select]);

  const focusWish = useCallback(
    (id: string) => {
      const st = useWishStore.getState();
      const wish = st.wishes.find((w) => w.id === id) ?? st.older.find((w) => w.id === id);
      if (!wish) return;
      select(id);
      if (wish.slotId) cameraControls.flyTo(wish.slotId); // FR-004-03; điều ước cũ (007) không có slot
    },
    [select],
  );

  const deselect = useCallback(() => {
    select(null);
  }, [select]);

  const step = useCallback(
    (dir: 'prev' | 'next') => {
      if (!selectedId) return;
      const list = visibleWishes.some((w) => w.id === selectedId) ? visibleWishes : wishes;
      const next = getAdjacentWishId(list, selectedId, dir);
      if (next) focusWish(next);
    },
    [selectedId, visibleWishes, wishes, focusWish],
  );

  const handleSubmit = async (draft: WishDraft, opts: SubmitOptions): Promise<boolean> => {
    if (composer.open && composer.mode === 'edit' && remote) {
      // Sửa trên cây chung: chỉ người giữ owner token (FR-007-12)
      const r = await remoteWishes.update(composer.wish.id, draft);
      if (!r.ok) {
        toast(remoteErrorText(r.error), { tone: 'error' });
        return false;
      }
      events.emit('wish:updated', { wish: r.value });
      setComposer({ open: false });
      return true;
    }
    if (composer.open && composer.mode === 'edit') {
      const r = useWishStore.getState().updateWish(composer.wish.id, draft);
      if (!r.ok) {
        toast(vi.view.gone, { tone: 'error' }); // ERR-005-01
        setComposer({ open: false });
        return false;
      }
      events.emit('wish:updated', { wish: r.value });
      setComposer({ open: false });
      return true;
    }
    if (opts.pickSlot) {
      // Chuyển sang chế độ chọn cành (FR-003-04)
      setPickDraft(draft);
      setComposer({ open: false });
      select(null);
      return true;
    }
    const r = await hangWishAnyMode(draft);
    if (r.ok) {
      setComposer({ open: false });
      select(null);
    }
    return r.ok;
  };

  const onSlotPick = (slotId: string) => {
    if (!pickDraft) return;
    const r = hangFromDraft(pickDraft, { slotId });
    if (r.ok) setPickDraft(null);
  };

  const cancelPick = () => {
    if (pickDraft) draftStorage.save(pickDraft);
    setPickDraft(null);
  };

  const editInitial = useMemo(
    () => (composer.open && composer.mode === 'edit' ? { ...composer.wish } : undefined),
    [composer],
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-night-950 text-amber-50">
      <main className="absolute inset-0">
        <BanyanScene
          wishes={wishes}
          onWishClick={pickDraft ? undefined : focusWish}
          pickableSlots={pickDraft ? freeSlotsOf(wishes) : null}
          onSlotClick={onSlotPick}
          highlightIds={matchedIds}
          selectedId={selectedId}
          reducedMotion={reducedMotion}
          onBackgroundClick={deselect}
        />
      </main>

      {/* Thanh trên */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 bg-gradient-to-b from-night-950/90 to-transparent p-3 sm:p-4">
        <div className="pointer-events-auto">
          <h1 className="flex items-center gap-2 font-display text-2xl text-amber-200 drop-shadow sm:text-3xl">
            <BrandMark size={40} />
            {vi.app.title}
          </h1>
          <p className="text-sm text-amber-100/75">
            {vi.app.subtitle} · <span aria-live="polite">{vi.app.counter(wishes.length, MAX_WISHES)}</span>
          </p>
        </div>
        <div className="pointer-events-auto">
          <SceneControls />
        </div>
      </header>

      {/* Thanh dưới */}
      <nav className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-night-950/90 to-transparent p-3 pb-5 sm:p-5">
        {pickDraft ? (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-night-900/90 px-4 py-2 text-sm">
            <span>{vi.compose.pickSlotHint}</span>
            <button type="button" className="btn-secondary" onClick={cancelPick}>
              {vi.compose.cancelPick}
            </button>
          </div>
        ) : (
          <>
            {isFull && <p className="pointer-events-auto text-sm text-amber-200">{vi.compose.treeFull}</p>}
            <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary text-base" disabled={isFull} onClick={() => setComposer({ open: true, mode: 'create' })}>
                <BrushIcon /> {vi.compose.open}
              </button>
              <button type="button" className="btn-secondary" onClick={openDrawer}>
                <ScrollIcon /> {vi.view.openList}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setBackupOpen(true)}>
                <ChestIcon /> {vi.manage.backup}
              </button>
            </div>
          </>
        )}
      </nav>

      {selectedWish && !pickDraft && (
        <div className="pointer-events-none absolute inset-x-3 bottom-24 flex justify-center sm:inset-x-auto sm:right-5 sm:top-24 sm:bottom-auto">
          <WishDetailCard
            key={selectedWish.id}
            wish={selectedWish}
            onPrev={() => step('prev')}
            onNext={() => step('next')}
            onClose={deselect}
            actions={
              <>
                {(!remote || remoteWishes.canManage(selectedWish.id)) && (
                  <WishActions wish={selectedWish} onEdit={(w) => setComposer({ open: true, mode: 'edit', wish: w })} onRemoved={deselect} />
                )}
                <ShareButton wish={selectedWish} />
              </>
            }
          />
        </div>
      )}

      <WishComposer
        open={composer.open}
        mode={composer.open ? composer.mode : 'create'}
        initialValue={editInitial}
        quota={remote ? quota ?? { remaining: 3, limit: 3 } : null}
        allowPickSlot={!remote}
        onClose={() => setComposer({ open: false })}
        onSubmit={handleSubmit}
      />
      <WishListDrawer
        onSelect={(id) => {
          closeDrawer();
          focusWish(id);
        }}
        onCompose={() => setComposer({ open: true, mode: 'create' })}
      />
      <BackupPanel open={backupOpen} onClose={() => setBackupOpen(false)} />
      <IncomingWishOverlay />
      <Toaster />
    </div>
  );
}
