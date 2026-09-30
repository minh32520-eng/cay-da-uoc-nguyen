import { useEffect } from 'react';
import { remoteWishes, useWishStore, wishRepository } from '@/entities/wish';
import { vi } from '@/shared/i18n/vi';
import { toast } from '@/shared/ui/toast';

export const REMOTE_POLL_MS = 30_000; // FR-007-04

/**
 * Local: nạp localStorage + đồng bộ giữa các tab (FR-003-09, FR-003-15).
 * Remote: tải cây chung + lượt còn lại, tải lại mỗi 30 s khi tab hiển thị (FR-007-02, FR-007-04).
 */
export function useWishPersistence() {
  useEffect(() => {
    if (!remoteWishes.enabled) {
      const { hydrate } = useWishStore.getState();
      hydrate();
      if (useWishStore.getState().corruptedOnLoad) toast(vi.hang.corrupted, { tone: 'error' });
      return wishRepository.subscribe(() => useWishStore.getState().hydrate());
    }

    let warned = false;
    const sync = async () => {
      const r = await remoteWishes.sync();
      if (!r.ok && !warned) {
        warned = true; // ERR-007-03: báo một lần, giữ dữ liệu cũ
        toast(vi.remote.loadFailed, { tone: 'error' });
      }
      if (r.ok) warned = false;
    };
    void sync();
    void remoteWishes.refreshQuota();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void sync();
    }, REMOTE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
