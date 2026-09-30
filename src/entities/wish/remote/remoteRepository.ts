import { z } from 'zod';
import type { BackendConfig } from '@/shared/config/backend';
import { PAPER_COLORS, WISH_CATEGORIES, type Result, type Wish, type WishDraft } from '../types';

/** Hàng đọc từ view `public_wishes` (007 §5). */
export const RemoteWishRowSchema = z
  .object({
    id: z.string().uuid(),
    content: z.string().min(1).max(800),
    author: z.string().min(1).max(120),
    category: z.enum(WISH_CATEGORIES),
    paper_color: z.enum(PAPER_COLORS),
    source: z.enum(['local', 'shared']),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();
export type RemoteWishRow = z.infer<typeof RemoteWishRowSchema>;

export const QuotaSchema = z.object({ used: z.number().int().min(0), limit: z.number().int().min(1), remaining: z.number().int().min(0) });
export type Quota = z.infer<typeof QuotaSchema>;

export type RemoteError =
  | 'NETWORK'
  | 'VALIDATION'
  | 'PROFANITY'
  | 'QUOTA_EXCEEDED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'GONE'
  | 'SERVER'
  | 'BAD_RESPONSE';

const KNOWN: readonly RemoteError[] = ['VALIDATION', 'PROFANITY', 'QUOTA_EXCEEDED', 'FORBIDDEN', 'NOT_FOUND', 'GONE'];

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Client HTTP cho Supabase, chỉ dùng anon key + fetch (NFR-007-05). */
export function createRemoteRepository(backend: BackendConfig, fetchImpl: FetchLike = (i, init) => fetch(i, init)) {
  const headers = { apikey: backend.anonKey, Authorization: `Bearer ${backend.anonKey}` };
  const fnUrl = `${backend.url}/functions/v1/wishes`;

  async function call<T>(url: string, init: RequestInit, schema: z.ZodType<T>): Promise<Result<T, RemoteError>> {
    let res: Response;
    try {
      res = await fetchImpl(url, { ...init, headers: { ...headers, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
    } catch {
      return { ok: false, error: 'NETWORK' };
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const code = z.object({ error: z.string() }).safeParse(body);
      const known = code.success && (KNOWN as readonly string[]).includes(code.data.error);
      return { ok: false, error: known ? (code.data!.error as RemoteError) : res.status === 429 ? 'QUOTA_EXCEEDED' : 'SERVER' };
    }
    const parsed = schema.safeParse(body);
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: 'BAD_RESPONSE' };
  }

  const draftBody = (d: WishDraft) => ({ content: d.content, author: d.author, category: d.category, paperColor: d.paperColor });

  return {
    list(offset = 0, limit = 100) {
      const url = `${backend.url}/rest/v1/public_wishes?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
      return call(url, { method: 'GET' }, z.array(RemoteWishRowSchema));
    },
    quota() {
      return call(`${fnUrl}/quota`, { method: 'GET' }, QuotaSchema);
    },
    create(draft: WishDraft, ownerToken: string, source: Wish['source'] = 'local') {
      return call(
        fnUrl,
        { method: 'POST', body: JSON.stringify({ ...draftBody(draft), source, ownerToken }) },
        z.object({ wish: RemoteWishRowSchema, quota: QuotaSchema }),
      );
    },
    async update(id: string, draft: WishDraft, ownerToken: string) {
      const r = await call(
        `${fnUrl}/${id}`,
        { method: 'PATCH', body: JSON.stringify({ ...draftBody(draft), ownerToken }) },
        z.object({ wish: RemoteWishRowSchema }),
      );
      return r.ok ? ({ ok: true, value: r.value.wish } as const) : r;
    },
    remove(id: string, ownerToken: string) {
      return call(`${fnUrl}/${id}`, { method: 'DELETE', body: JSON.stringify({ ownerToken }) }, z.object({ id: z.string() }));
    },
    async restore(id: string, ownerToken: string) {
      const r = await call(`${fnUrl}/${id}/restore`, { method: 'POST', body: JSON.stringify({ ownerToken }) }, z.object({ wish: RemoteWishRowSchema }));
      return r.ok ? ({ ok: true, value: r.value.wish } as const) : r;
    },
  };
}

export type RemoteRepository = ReturnType<typeof createRemoteRepository>;
