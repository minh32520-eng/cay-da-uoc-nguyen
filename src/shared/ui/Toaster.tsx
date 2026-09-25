import { useToastStore } from './toast';

const TONE: Record<string, string> = {
  info: 'bg-night-800/95 border-amber-300/40',
  success: 'bg-emerald-900/95 border-emerald-300/50',
  error: 'bg-red-950/95 border-red-300/60',
};

/** Vùng thông báo, đồng thời là aria-live cho screen reader (NFR-003-05). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-sm text-amber-50 shadow-lg animate-rise ${TONE[t.tone]}`}
        >
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="btn-ghost shrink-0 font-semibold text-amber-300"
              onClick={() => {
                t.action?.onClick();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
