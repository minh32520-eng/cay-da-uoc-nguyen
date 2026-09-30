import { WishPaperPreview } from '@/features/write-wish';
import { vi } from '@/shared/i18n/vi';
import { Modal } from '@/shared/ui/Modal';
import { OrnamentIcon } from '@/shared/ui/icons';
import { useIncomingStore } from './useIncomingSharedWish';

/** Tờ ước nguyện "khách" từ link chia sẻ (FR-006-07/08). */
export function IncomingWishOverlay() {
  const incoming = useIncomingStore((s) => s.incoming);
  const accept = useIncomingStore((s) => s.accept);
  const dismiss = useIncomingStore((s) => s.dismiss);

  return (
    <Modal open={incoming !== null} title={vi.share.incomingTitle} onClose={dismiss}>
      {incoming && (
        <div className="flex flex-col items-center gap-6">
          <div className="animate-float py-4">
            <WishPaperPreview draft={incoming.draft} size="lg" />
          </div>
          <div className="flex w-full gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={dismiss}>
              {vi.share.dismiss}
            </button>
            <button type="button" className="btn-primary flex-1" onClick={() => accept()}>
              <OrnamentIcon /> {vi.share.accept}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
