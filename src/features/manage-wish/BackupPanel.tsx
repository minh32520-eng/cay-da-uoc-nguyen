import { useRef, useState } from 'react';
import { remoteWishes, useWishStore, type ImportMode, type ImportPreview } from '@/entities/wish';
import { events } from '@/shared/lib/events';
import { vi } from '@/shared/i18n/vi';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Modal } from '@/shared/ui/Modal';
import { toast } from '@/shared/ui/toast';
import { DownloadIcon, TrashIcon, UploadIcon } from '@/shared/ui/icons';
import { backupService } from './backupService';

interface BackupPanelProps {
  open: boolean;
  onClose: () => void;
}

/** Xuất / nhập / xoá toàn bộ (FR-005-07..14). */
export function BackupPanel({ open, onClose }: BackupPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const count = useWishStore((s) => s.wishes.length);
  const remote = remoteWishes.enabled;

  const onFile = async (file: File | undefined) => {
    setError(null);
    setPreview(null);
    if (!file) return;
    const read = await backupService.readFile(file);
    if (!read.ok) {
      setError(read.error === 'TOO_LARGE' ? vi.manage.errTooLarge : vi.manage.errNotJson);
      return;
    }
    const p = backupService.preview(read.value, useWishStore.getState().wishes);
    if (!p.ok) {
      setError(vi.manage.errBadFormat);
      return;
    }
    if (p.value.valid.length === 0) setError(vi.manage.errNoValid);
    setPreview(p.value);
  };

  const doImport = (mode: ImportMode) => {
    if (!preview) return;
    const r = useWishStore.getState().importWishes(preview, mode);
    if (!r.ok) {
      toast(vi.manage.errStorage, { tone: 'error' });
      return;
    }
    events.emit('wishes:imported', { added: r.value.added, mode });
    toast(vi.manage.imported(r.value.added), { tone: 'success' });
    if (r.value.skipped > 0) toast(vi.manage.overflowed(r.value.skipped));
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <Modal open={open && !confirmClear} title={vi.manage.backupTitle} onClose={onClose}>
        <div className="space-y-5">
          <section className="space-y-2">
            <button
              type="button"
              className="btn-primary w-full"
              disabled={count === 0}
              onClick={() => {
                const st = useWishStore.getState();
                backupService.exportToFile([...st.wishes, ...st.older]);
              }}
            >
              <DownloadIcon size={18} /> {vi.manage.exportBtn} ({vi.app.counter(count, 100)})
            </button>
          </section>

          {/* Cây chung: ẩn nhập / xoá toàn bộ (FR-007-15) */}
          {!remote && (
          <section className="space-y-2">
            <label className="btn-secondary block w-full cursor-pointer text-center focus-within:ring-2 focus-within:ring-amber-300">
              <UploadIcon size={18} className="mr-1 inline" /> {vi.manage.importBtn}
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            {preview && (
              <div className="rounded-xl border border-amber-100/15 bg-night-800/60 p-3 text-sm">
                <h3 className="mb-1 font-semibold text-amber-200">{vi.manage.importSummary}</h3>
                <ul className="mb-3 list-inside list-disc space-y-0.5 text-amber-100/85">
                  <li>{vi.manage.importValid(preview.valid.length)}</li>
                  <li>{vi.manage.importDup(preview.duplicateIds.length)}</li>
                  <li>{vi.manage.importInvalid(preview.invalidCount)}</li>
                  {preview.overflowCount > 0 && <li>{vi.manage.importOverflow(preview.overflowCount)}</li>}
                </ul>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary flex-1" disabled={preview.valid.length === 0} onClick={() => doImport('merge')}>
                    {vi.manage.merge}
                  </button>
                  <button type="button" className="btn-secondary flex-1" disabled={preview.valid.length === 0} onClick={() => doImport('replace')}>
                    {vi.manage.replace}
                  </button>
                </div>
              </div>
            )}
          </section>
          )}

          {!remote && (
          <section className="border-t border-amber-100/10 pt-4">
            <button type="button" className="btn-danger w-full" disabled={count === 0} onClick={() => setConfirmClear(true)}>
              <TrashIcon size={18} /> {vi.manage.clearAll}
            </button>
          </section>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmClear}
        title={vi.manage.clearAll}
        message={vi.manage.clearAllConfirm}
        keyword="XOA"
        danger
        confirmLabel={vi.manage.clearAll}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          useWishStore.getState().clearAll();
          events.emit('wishes:cleared', {});
          toast(vi.manage.cleared);
          setConfirmClear(false);
          onClose();
        }}
      />
    </>
  );
}
