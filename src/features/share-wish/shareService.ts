import QRCode from 'qrcode';
import { vi } from '@/shared/i18n/vi';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Web Share nếu có, nếu không thì sao chép vào clipboard (FR-006-04/05). */
export async function shareUrl(url: string, text?: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: vi.share.shareTitle, text, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'; // ERR-006-06
      // Rơi xuống clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed'; // ERR-006-05
  }
}

/** Sinh QR phía client (FR-006-06). */
export function qrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#1a0f00', light: '#fff7e6' },
  });
}
