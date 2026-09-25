import { useEffect, useState } from 'react';
import type { Wish } from '@/entities/wish';
import { events } from '@/shared/lib/events';
import { vi } from '@/shared/i18n/vi';
import { Modal } from '@/shared/ui/Modal';
import { toast } from '@/shared/ui/toast';
import { DownloadIcon, LinkIcon, QrIcon } from '@/shared/ui/icons';
import { buildShareUrl } from './shareCodec';
import { qrDataUrl, shareUrl } from './shareService';

/** Nút Chia sẻ + Mã QR trong thẻ chi tiết (FR-006-01..06). */
export function ShareButton({ wish }: { wish: Wish }) {
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const getUrl = (): string | null => {
    const r = buildShareUrl(wish);
    if (!r.ok) {
      toast(vi.share.tooLong, { tone: 'error' }); // ERR-006-04
      return null;
    }
    return r.value;
  };

  const onShare = async () => {
    const url = getUrl();
    if (!url) return;
    const outcome = await shareUrl(url, wish.content);
    if (outcome === 'shared') events.emit('share:created', { method: 'native' });
    else if (outcome === 'copied') {
      events.emit('share:created', { method: 'clipboard' });
      toast(vi.share.copied, { tone: 'success' });
    } else if (outcome === 'failed') setManualUrl(url);
  };

  return (
    <>
      <button type="button" className="btn-secondary px-3" onClick={() => void onShare()}>
        <LinkIcon size={18} /> {vi.share.share}
      </button>
      <button
        type="button"
        className="btn-secondary px-3"
        onClick={() => {
          const url = getUrl();
          if (url) setQrUrl(url);
        }}
      >
        <QrIcon size={18} /> {vi.share.qr}
      </button>

      <Modal open={manualUrl !== null} title={vi.share.share} onClose={() => setManualUrl(null)}>
        <p className="mb-2 text-sm">{vi.share.copyManual}</p>
        <input readOnly className="field" value={manualUrl ?? ''} onFocus={(e) => e.currentTarget.select()} aria-label={vi.share.share} />
      </Modal>
      <ShareQrDialog url={qrUrl} onClose={() => setQrUrl(null)} />
    </>
  );
}

export function ShareQrDialog({ url, onClose }: { url: string | null; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setDataUrl(null);
    if (!url) return;
    let alive = true;
    void qrDataUrl(url).then((d) => alive && setDataUrl(d));
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <Modal open={url !== null} title={vi.share.qrTitle} onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        {dataUrl ? (
          <img src={dataUrl} alt={vi.share.qrTitle} width={260} height={260} className="rounded-lg" />
        ) : (
          <div className="h-[260px] w-[260px] animate-pulse rounded-lg bg-amber-100/10" />
        )}
        {dataUrl && (
          <a href={dataUrl} download="dieu-uoc-trung-thu.png" className="btn-primary">
            <DownloadIcon size={18} /> {vi.share.downloadQr}
          </a>
        )}
      </div>
    </Modal>
  );
}
