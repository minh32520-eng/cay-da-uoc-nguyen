import type { Wish } from '@/entities/wish';
import type { BranchSlot } from './types';

/** Props chung cho cảnh 3D và 2D (001 §6). */
export interface SceneProps {
  wishes: Wish[];
  onWishClick?: (wishId: string) => void;
  /** Khi khác null: đang ở chế độ tự chọn cành (FR-003-04). */
  pickableSlots: BranchSlot[] | null;
  onSlotClick?: (slotId: string) => void;
  highlightIds: Set<string> | null;
  selectedId: string | null;
  reducedMotion: boolean;
  /** Click vào chỗ trống: đóng thẻ chi tiết (FR-004-15). */
  onBackgroundClick?: () => void;
}
