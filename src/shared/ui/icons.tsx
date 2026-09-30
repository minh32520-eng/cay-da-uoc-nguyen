import { useId, type ReactNode, type SVGProps } from 'react';
import type { WishCategory } from '@/entities/wish/types';

/**
 * Bộ icon vẽ riêng cho Cây Thông Ước Nguyện — nét tròn 1.7px, lưới 24×24,
 * mang hoạ tiết Giáng sinh (quả châu, ngôi sao, cuộn thư, bút lông).
 * Icon mặc định là trang trí (aria-hidden); nút bấm tự có aria-label.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

const STAR_PATH = 'M12 3 14.2 8.9 20.6 9.2 15.6 13.2 17.3 19.3 12 15.8 6.7 19.3 8.4 13.2 3.4 9.2 9.8 8.9Z';

/** Quả châu Giáng sinh: móc treo, nắp, thân tròn có hoa văn sóng. */
export const OrnamentIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 1.8a1.5 1.5 0 0 1 1.5 1.5" />
    <rect x="9.6" y="3.8" width="4.8" height="2.6" rx="0.8" />
    <circle cx="12" cy="14.2" r="7.8" />
    <path d="M4.6 12.2c1.8 1.4 3.6 1.4 5.2 0s3.6-1.4 5.2 0 3.6 1.4 4.4.2" />
    <path d="M5 17.3c1.7 1.2 3.4 1.2 5 0s3.3-1.2 5 0 3.2 1.1 4-.1" />
  </Icon>
);

export const StarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d={STAR_PATH} />
    <path d="M12 8.9v6.9M9.8 8.9l5.8 4.3M14.2 8.9l-5.8 4.3" strokeWidth={1} opacity={0.7} />
  </Icon>
);

export const BrushIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 3.5 13.2 10.8" />
    <path d="M18.2 3.3l2.5 2.5" />
    <path d="M13.2 10.8c-1.4-1-3.4-.6-4.4.9-1.2 1.8-.9 4.1-3.6 6.1 3.2.6 6.3-.2 7.9-2 1.1-1.3 1.3-3.4.1-5Z" />
    <path d="M3.5 21.2h9" />
  </Icon>
);

export const ScrollIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 20.5H6a2.3 2.3 0 0 1-2.3-2.3V17h10.6v1.2a2.3 2.3 0 0 0 4.6 0V5.8A2.3 2.3 0 0 1 21.2 3.5H10.3A2.3 2.3 0 0 0 8 5.8V17" />
    <path d="M21.2 3.5a2.3 2.3 0 0 1 0 4.6h-2.3" />
    <path d="M11 8h4.5M11 11h4.5M11 14h2.8" />
  </Icon>
);

export const ChestIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 10h17v8.8a1.2 1.2 0 0 1-1.2 1.2H4.7a1.2 1.2 0 0 1-1.2-1.2Z" />
    <path d="M3.5 10a5 5 0 0 1 5-5h7a5 5 0 0 1 5 5" />
    <path d="M3.5 13.2h17" />
    <rect x="10.3" y="11.6" width="3.4" height="3.8" rx="0.8" />
  </Icon>
);

export const RotateLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4L4.5 8.8" />
    <path d="M4.5 4.3v4.5H9" />
  </Icon>
);

export const RotateRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4l2.3 2.2" />
    <path d="M19.5 4.3v4.5H15" />
  </Icon>
);

export const ZoomInIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.3 15.3 5 5M10.5 7.8v5.4M7.8 10.5h5.4" />
  </Icon>
);

export const ZoomOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.3 15.3 5 5M7.8 10.5h5.4" />
  </Icon>
);

export const RecenterIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="6.8" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    <path d="M12 2.2v3M12 18.8v3M2.2 12h3M18.8 12h3" />
  </Icon>
);

export const MusicIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 17.5V6.2l10-2v11.2" />
    <circle cx="6.6" cy="17.6" r="2.4" />
    <circle cx="16.6" cy="15.5" r="2.4" />
    <path d="M9 9.4l10-2" />
  </Icon>
);

export const MusicOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 11V6.2l10-2v8.5M9 13.5v4" />
    <circle cx="6.6" cy="17.6" r="2.4" />
    <path d="M3.5 3.5l17 17" />
  </Icon>
);

export const CubeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2.8 20 7.3v9.4l-8 4.5-8-4.5V7.3Z" />
    <path d="M12 12l8-4.7M12 12v9.2M12 12 4 7.3" />
  </Icon>
);

export const PictureIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
    <path d="m3.8 16.5 5-5 4 4 2.2-2.2 5.2 5.2" />
    <circle cx="15.8" cy="9" r="1.7" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const EditIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4.2L19.3 8.9a2.1 2.1 0 0 0-3-3L5.2 16.9Z" />
    <path d="m14.6 7.6 3 3M13 20h7" />
  </Icon>
);

export const FallingLeafIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 18.5C5.5 10.6 10.4 5.6 19 4.8c-.8 8.6-5.8 13.7-13.5 13.7Z" />
    <path d="M5.5 18.5 13 11M3.5 21l2-2.5" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
);

export const QrIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" />
    <path d="M14 14h2.5v2.5M20.5 14v.1M14 20.5h.1M17.5 20.5h3v-3" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5" />
    <path d="M4 15.5v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 14.5v-11M7.5 8 12 3.5 16.5 8" />
    <path d="M4 15.5v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
    <path d="M6 6.5 7 19a1.6 1.6 0 0 0 1.6 1.5h6.8A1.6 1.6 0 0 0 17 19l1-12.5M10 10.5v6M14 10.5v6" />
  </Icon>
);

export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 3.5c.6 4.1 2.1 5.6 6.2 6.2-4.1.6-5.6 2.1-6.2 6.2-.6-4.1-2.1-5.6-6.2-6.2 4.1-.6 5.6-2.1 6.2-6.2Z" />
    <path d="M18.5 15.5c.3 1.9.9 2.5 2.8 2.8-1.9.3-2.5.9-2.8 2.8-.3-1.9-.9-2.5-2.8-2.8 1.9-.3 2.5-.9 2.8-2.8Z" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 6 8.5 12l6 6" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);

/* ---- Chủ đề ước nguyện ---- */

export const FamilyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11.2 12 4l9 7.2" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M12 17.6s-3.2-1.9-3.2-3.8a1.7 1.7 0 0 1 3.2-.8 1.7 1.7 0 0 1 3.2.8c0 1.9-3.2 3.8-3.2 3.8Z" />
  </Icon>
);

export const StudyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6.3C9.8 4.8 6.9 4.3 3.5 4.8v13.4c3.4-.5 6.3 0 8.5 1.5 2.2-1.5 5.1-2 8.5-1.5V4.8c-3.4-.5-6.3 0-8.5 1.5Z" />
    <path d="M12 6.3v13.4" />
  </Icon>
);

export const HealthIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21v-8" />
    <path d="M12 13C12 8.2 8.8 5 4 5c0 4.8 3.2 8 8 8Z" />
    <path d="M12 13c0-4.8 3.2-8 8-8 0 4.8-3.2 8-8 8Z" />
  </Icon>
);

export const LoveIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
  </Icon>
);

export const CareerIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="7.2" width="17" height="12.8" rx="2" />
    <path d="M9 7.2V5.5a1.3 1.3 0 0 1 1.3-1.3h3.4A1.3 1.3 0 0 1 15 5.5v1.7M3.5 12.8h17M11 12.8v1.8h2v-1.8" />
  </Icon>
);

const CATEGORY_COMPONENT: Record<WishCategory, (p: IconProps) => ReactNode> = {
  family: FamilyIcon,
  study: StudyIcon,
  health: HealthIcon,
  love: LoveIcon,
  career: CareerIcon,
  other: StarIcon,
};

export function CategoryIcon({ category, ...p }: IconProps & { category: WishCategory }) {
  const C = CATEGORY_COMPONENT[category];
  return <C {...p} />;
}

/* ---- Logo: cây thông phủ tuyết, ngôi sao trên đỉnh ---- */

const BRAND_PATHS = {
  star: 'M32 2.5 34.6 8.4 41 8.9 36.1 13 37.6 19.3 32 15.9 26.4 19.3 27.9 13 23 8.9 29.4 8.4Z',
  tiers: [
    'M32 14 44 30H20Z',
    'M32 22 49 42H15Z',
    'M32 31 54 55H10Z',
  ],
  snow: [
    'M25.5 26.5c2 1.4 4.3 1.4 6.5 0s4.5-1.4 6.5 0',
    'M21 37.5c2.7 1.6 5.6 1.6 8.3 0s5.6-1.6 8.4 0 5.6 1.6 7.3.3',
    'M16 50c3 1.8 6.4 1.8 9.6 0s6.4-1.8 9.6 0 6.4 1.8 9.6 0 4.5-1.3 5.2-.6',
  ],
};

export function BrandMark({ size = 40 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f9a55" />
          <stop offset="1" stopColor="#15512c" />
        </linearGradient>
        <radialGradient id={`${id}s`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="1" stopColor="#f5b820" />
        </radialGradient>
      </defs>
      <rect x="28.5" y="54" width="7" height="7" rx="1" fill="#6b4226" />
      {BRAND_PATHS.tiers.map((d) => (
        <path key={d} d={d} fill={`url(#${id}g)`} stroke="#0f3b21" strokeWidth="1" strokeLinejoin="round" />
      ))}
      {BRAND_PATHS.snow.map((d) => (
        <path key={d} d={d} stroke="#f4f8ff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      ))}
      <circle cx="26" cy="44" r="2.2" fill="#e63946" />
      <circle cx="39" cy="33" r="2" fill="#f2b134" />
      <circle cx="37" cy="47" r="2.2" fill="#4dabf7" />
      <circle cx="29" cy="27" r="1.7" fill="#f783ac" />
      <path d={BRAND_PATHS.star} fill={`url(#${id}s)`} stroke="#d99a06" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}
