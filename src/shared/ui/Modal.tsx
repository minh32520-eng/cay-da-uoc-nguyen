import { useEffect, useId, useRef, type ReactNode } from 'react';
import { vi } from '@/shared/i18n/vi';
import { CloseIcon } from './icons';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  role?: 'dialog' | 'alertdialog';
  variant?: 'center' | 'drawer';
  /** Phần tử nhận focus khi mở; mặc định là phần tử focus được đầu tiên. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  hideTitle?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal truy cập được: role=dialog, aria-modal, bẫy focus, Esc để đóng,
 * trả focus về phần tử đã mở (NFR-002-02).
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  role = 'dialog',
  variant = 'center',
  initialFocusRef,
  className = '',
  hideTitle = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const target =
      initialFocusRef?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
    target?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel?.addEventListener('keydown', onKey);
    return () => {
      panel?.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const panelClass =
    variant === 'drawer'
      ? 'ml-auto h-full w-full max-w-md overflow-y-auto border-l border-amber-200/20 animate-slide-in'
      : 'm-auto max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-200/25 max-sm:h-full max-sm:max-w-none max-sm:rounded-none animate-rise';

  return (
    <div
      className="fixed inset-0 z-40 flex bg-black/60 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-night-900 p-5 text-amber-50 shadow-2xl outline-none ${panelClass} ${className}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'font-display text-xl text-amber-200'}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label={vi.compose.close}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
