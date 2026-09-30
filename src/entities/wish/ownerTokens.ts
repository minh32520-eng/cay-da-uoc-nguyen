import { z } from 'zod';
import { readJson, writeRaw } from '@/shared/lib/storage';

/**
 * Mã sở hữu điều ước (FR-007-11): 32 byte ngẫu nhiên, base64url, chỉ lưu trong trình duyệt người viết.
 * Server chỉ giữ bản băm SHA-256.
 */
const KEY = 'banyan:owners:v1';
const TokenMapSchema = z.record(z.string(), z.string().regex(/^[A-Za-z0-9_-]{43}$/));

function load(): Record<string, string> {
  const r = TokenMapSchema.safeParse(readJson(KEY));
  return r.success ? r.data : {};
}

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const ownerTokens = {
  create(): string {
    return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  },
  get(id: string): string | null {
    return load()[id] ?? null;
  },
  has(id: string): boolean {
    return id in load();
  },
  set(id: string, token: string): void {
    const map = load();
    map[id] = token;
    try {
      writeRaw(KEY, JSON.stringify(map));
    } catch {
      /* không lưu được thì chỉ mất quyền sửa/gỡ sau khi tải lại */
    }
  },
};
