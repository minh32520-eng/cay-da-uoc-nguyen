import { useEffect } from 'react';
import { useWishStore, wishRepository } from '@/entities/wish';
import { vi } from '@/shared/i18n/vi';
import { toast } from '@/shared/ui/toast';

/** Nạp ước nguyện khi khởi động và đồng bộ giữa các tab (FR-003-09, FR-003-15). */
export function useWishPersistence() {
  useEffect(() => {
    const { hydrate } = useWishStore.getState();
    hydrate();
    if (useWishStore.getState().corruptedOnLoad) toast(vi.hang.corrupted, { tone: 'error' });
    return wishRepository.subscribe(() => useWishStore.getState().hydrate());
  }, []);
}
