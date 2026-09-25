import { useRef, useState } from 'react';
import { vi } from '@/shared/i18n/vi';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Bắt người dùng gõ đúng từ khoá mới cho xác nhận (FR-005-12). */
  keyword?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp xác nhận: role=alertdialog, focus mặc định ở nút Huỷ (NFR-005-05). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = vi.manage.confirm,
  cancelLabel = vi.manage.cancel,
  danger = false,
  keyword,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState('');
  const canConfirm = !keyword || typed.trim() === keyword;

  const close = () => {
    setTyped('');
    onCancel();
  };

  return (
    <Modal open={open} title={title} onClose={close} role="alertdialog" initialFocusRef={cancelRef}>
      {message && <p className="mb-4 text-amber-100/90">{message}</p>}
      {keyword && (
        <input
          aria-label={message ?? title}
          className="field mb-4"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
      )}
      <div className="flex justify-end gap-2">
        <button ref={cancelRef} type="button" className="btn-secondary" onClick={close}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? 'btn-danger' : 'btn-primary'}
          disabled={!canConfirm}
          onClick={() => {
            setTyped('');
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
