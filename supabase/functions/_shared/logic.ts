/**
 * Logic thuần của Edge Function `wishes` (NFR-007-06).
 * Không dùng API riêng của Deno để chạy được cả trong Vitest (Node) lẫn Deno.
 */
import { PROFANITY_WORDS } from './profanity.ts';

export const CATEGORIES = ['family', 'study', 'health', 'love', 'career', 'other'] as const;
export const PAPER_COLORS = ['red', 'yellow', 'pink', 'green', 'blue'] as const;
export const SOURCES = ['local', 'shared'] as const;
export const MAX_CONTENT = 200;
export const MAX_AUTHOR = 30;
export const DEFAULT_AUTHOR = 'Ẩn danh';
export const WISH_LIMIT_PER_IP = 3;

export interface WishInput {
  content: string;
  author: string;
  category: (typeof CATEGORIES)[number];
  paperColor: (typeof PAPER_COLORS)[number];
  source: (typeof SOURCES)[number];
  ownerToken: string;
}

export type InputError = 'VALIDATION' | 'PROFANITY';

const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
const graphemes = (s: string) => Array.from(segmenter.segment(s)).length;
const phrases = PROFANITY_WORDS.map((w) => ` ${w.normalize('NFC').toLowerCase()} `);

export function containsProfanity(s: string): boolean {
  const tokens = s.normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length === 0) return false;
  const padded = ` ${tokens.join(' ')} `;
  return phrases.some((p) => padded.includes(p));
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);
/** owner token = 32 byte base64url (43 ký tự) do client sinh. */
export const OWNER_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** Validate lại toàn bộ input như client (FR-007-10). */
export function validateWishInput(body: unknown): { ok: true; data: WishInput } | { ok: false; error: InputError } {
  if (!isObj(body)) return { ok: false, error: 'VALIDATION' };
  const { content, author, category, paperColor, ownerToken } = body;
  const source = body.source ?? 'local';
  if (typeof content !== 'string' || typeof author !== 'string' || typeof ownerToken !== 'string') {
    return { ok: false, error: 'VALIDATION' };
  }
  const c = content.normalize('NFC').trim();
  const a = author.normalize('NFC').trim();
  if (c.length === 0 || graphemes(c) > MAX_CONTENT || graphemes(a) > MAX_AUTHOR) return { ok: false, error: 'VALIDATION' };
  if (!oneOf(CATEGORIES, category) || !oneOf(PAPER_COLORS, paperColor) || !oneOf(SOURCES, source)) {
    return { ok: false, error: 'VALIDATION' };
  }
  if (!OWNER_TOKEN_RE.test(ownerToken)) return { ok: false, error: 'VALIDATION' };
  if (containsProfanity(c) || containsProfanity(a)) return { ok: false, error: 'PROFANITY' };
  return { ok: true, data: { content: c, author: a || DEFAULT_AUTHOR, category, paperColor, source, ownerToken } };
}

/** Lấy IP người gửi: cf-connecting-ip → x-real-ip → phần tử đầu của x-forwarded-for (FR-007-07). */
export function clientIp(headers: Headers): string | null {
  const direct = headers.get('cf-connecting-ip') ?? headers.get('x-real-ip');
  if (direct?.trim()) return direct.trim();
  const first = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return first || null;
}

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/** HMAC-SHA256(secret, value) dạng hex — dùng để băm IP (NFR-007-02). */
export async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

/** SHA-256 dạng hex — dùng để băm owner token. */
export async function sha256Hex(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

/** Header CORS: chỉ trả Allow-Origin cho origin nằm trong danh sách (NFR-007-03). */
export function corsHeaders(origin: string | null, allowed: readonly string[]): Record<string, string> {
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) base['Access-Control-Allow-Origin'] = origin;
  return base;
}

export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION: 'Dữ liệu điều ước không hợp lệ.',
  PROFANITY: 'Điều ước có từ ngữ không phù hợp, vui lòng chỉnh sửa.',
  QUOTA_EXCEEDED: 'Mỗi địa chỉ IP chỉ được viết 3 điều ước. Bạn đã dùng hết lượt.',
  FORBIDDEN: 'Bạn chỉ có thể sửa hoặc gỡ điều ước của chính mình.',
  NOT_FOUND: 'Điều ước này không còn trên cây.',
  GONE: 'Đã quá thời gian hoàn tác.',
  NO_IP: 'Không xác định được thiết bị, vui lòng thử lại.',
  SERVER: 'Máy chủ gặp lỗi, vui lòng thử lại.',
  METHOD: 'Phương thức không được hỗ trợ.',
};

/** Ánh xạ lỗi RAISE trong Postgres (message) sang mã lỗi API. */
export function mapDbError(message: string): { status: number; code: string } {
  const m = message.toUpperCase();
  if (m.includes('QUOTA_EXCEEDED')) return { status: 429, code: 'QUOTA_EXCEEDED' };
  if (m.includes('FORBIDDEN')) return { status: 403, code: 'FORBIDDEN' };
  if (m.includes('NOT_FOUND')) return { status: 404, code: 'NOT_FOUND' };
  if (m.includes('GONE')) return { status: 410, code: 'GONE' };
  return { status: 500, code: 'SERVER' };
}
