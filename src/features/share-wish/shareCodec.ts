import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { z } from 'zod';
import {
  AuthorSchema,
  ContentSchema,
  PAPER_COLORS,
  WISH_CATEGORIES,
  type Result,
  type Wish,
  type WishDraft,
} from '@/entities/wish';

export const MAX_SHARE_URL_LENGTH = 2000;
export const MAX_PAYLOAD_INPUT_LENGTH = 4096;
export const SHARE_HASH_PREFIX = '#/w/';

/** Khoá rút gọn để link ngắn (006 §5). */
export interface SharedWishPayload {
  v: 1;
  c: string;
  a: string;
  k: Wish['category'];
  p: Wish['paperColor'];
  t: string;
}

export const SharedWishPayloadSchema = z
  .object({
    v: z.literal(1),
    c: ContentSchema,
    a: AuthorSchema,
    k: z.enum(WISH_CATEGORIES),
    p: z.enum(PAPER_COLORS),
    t: z.string().datetime({ offset: true }),
  })
  .strict();

export interface IncomingSharedWish {
  draft: WishDraft;
  originalCreatedAt: string;
}

export type DecodeError = 'TOO_LONG' | 'DECOMPRESS_FAILED' | 'BAD_JSON' | 'BAD_VERSION' | 'INVALID' | 'PROFANITY';

/** Chỉ đưa 5 trường nội dung vào link, không có id/slotId/source (FR-006-03). */
export function encodeWish(wish: Wish): string {
  const payload: SharedWishPayload = {
    v: 1,
    c: wish.content,
    a: wish.author,
    k: wish.category,
    p: wish.paperColor,
    t: wish.createdAt,
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeWish(payload: string): Result<IncomingSharedWish, DecodeError> {
  // Chặn "zip bomb" trước khi giải nén (NFR-006-04)
  if (payload.length > MAX_PAYLOAD_INPUT_LENGTH) return { ok: false, error: 'TOO_LONG' };

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(payload);
  } catch {
    json = null;
  }
  if (!json) return { ok: false, error: 'DECOMPRESS_FAILED' };

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'BAD_JSON' };
  }
  if (typeof raw === 'object' && raw !== null && 'v' in raw && raw.v !== 1) {
    return { ok: false, error: 'BAD_VERSION' };
  }

  const r = SharedWishPayloadSchema.safeParse(raw);
  if (!r.success) {
    const profane = r.error.issues.some((i) => i.message === 'PROFANITY');
    return { ok: false, error: profane ? 'PROFANITY' : 'INVALID' };
  }
  const { c, a, k, p, t } = r.data;
  return { ok: true, value: { draft: { content: c, author: a, category: k, paperColor: p }, originalCreatedAt: t } };
}

export function buildShareUrl(
  wish: Wish,
  location: Pick<Location, 'origin' | 'pathname' | 'search'> = window.location,
): Result<string, 'URL_TOO_LONG'> {
  // Payload nằm sau dấu # nên không bao giờ gửi tới server (NFR-006-01)
  const url = `${location.origin}${location.pathname}${location.search}${SHARE_HASH_PREFIX}${encodeWish(wish)}`;
  if (url.length > MAX_SHARE_URL_LENGTH) return { ok: false, error: 'URL_TOO_LONG' };
  return { ok: true, value: url };
}

export function parseShareHash(hash: string): string | null {
  return hash.startsWith(SHARE_HASH_PREFIX) ? hash.slice(SHARE_HASH_PREFIX.length) || null : null;
}

/** Trùng khi cùng nội dung, tên, ngày tạo gốc (FR-006-10). */
export function isDuplicateOf(incoming: IncomingSharedWish, wishes: readonly Wish[]): boolean {
  return wishes.some(
    (w) =>
      w.content === incoming.draft.content &&
      w.author === incoming.draft.author &&
      w.createdAt === incoming.originalCreatedAt,
  );
}
