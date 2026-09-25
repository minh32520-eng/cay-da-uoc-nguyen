import { useState } from 'react';
import { useWishStore, type UndoEntry, type Wish } from '@/entities/wish';
import { events } from '@/shared/lib/events';
import { vi } from '@/shared/i18n/vi';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { toast } from '@/shared/ui/toast';
import { EditIcon, FallingLeafIcon } from '@/shared/ui/icons';
import { UNDO_MS } from '@/entities/wish/constants';

/** Hoàn tác gỡ ước nguyện (FR-005-06, ERR-005-02/03). */
export function undoRemove(entry: UndoEntry): void {
  const r = useWishStore.getState().restoreWish(entry);
  if (!r.ok) {
    if (r.error === 'TREE_FULL') toast(vi.manage.undoTreeFull, { tone: 'error' });
    return;
  }
  events.emit('wish:restored', { wish: r.value.wish });
  if (r.value.moved) toast(vi.manage.restoredElsewhere);
}

interface WishActionsProps {
  wish: Wish;
  onEdit: (wish: Wish) => void;
  onRemoved?: () => void;
}

/** Nút Sửa / Gỡ trong thẻ chi tiết (FR-005-01). */
export function WishActions({ wish, onEdit, onRemoved }: WishActionsProps) {
  const [confirming, setConfirming] = useState(false);

  const remove = () => {
    setConfirming(false);
    const r = useWishStore.getState().removeWish(wish.id);
    if (!r.ok) return;
    events.emit('wish:removed', { wishId: wish.id });
    onRemoved?.();
    toast(vi.manage.removed, {
      durationMs: UNDO_MS,
      action: { label: vi.manage.undo, onClick: () => undoRemove(r.value) },
    });
  };

  return (
    <>
      <button type="button" className="btn-secondary px-3" onClick={() => onEdit(wish)}>
        <EditIcon size={18} /> {vi.manage.edit}
      </button>
      <button type="button" className="btn-secondary px-3" onClick={() => setConfirming(true)}>
        <FallingLeafIcon size={18} /> {vi.manage.remove}
      </button>
      <ConfirmDialog
        open={confirming}
        title={vi.manage.removeConfirm}
        confirmLabel={vi.manage.remove}
        danger
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
