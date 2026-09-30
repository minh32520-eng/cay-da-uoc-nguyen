import { afterEach, describe, expect, it, vi } from 'vitest';
import { BRANCH_SLOTS } from '@/scene/branchSlots';
import { resolveBackend } from '@/shared/config/backend';
import { ownerTokens } from '../ownerTokens';
import { assignRemoteSlots } from './assignRemoteSlots';
import { createRemoteRepository, type RemoteWishRow } from './remoteRepository';

let n = 0;
function row(o: Partial<RemoteWishRow> = {}): RemoteWishRow {
  n++;
  const ts = new Date(Date.UTC(2026, 11, 1, 0, 0, n)).toISOString();
  return {
    id: crypto.randomUUID(),
    content: `Điều ước ${n}`,
    author: 'Lan',
    category: 'family',
    paper_color: 'red',
    source: 'local',
    created_at: ts,
    updated_at: ts,
    ...o,
  };
}

describe('Cấu hình backend (FR-007-01)', () => {
  it('AC-007-01: thiếu biến môi trường → chế độ local', () => {
    expect(resolveBackend({})).toBeNull();
    expect(resolveBackend({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
    expect(resolveBackend({ VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_ANON_KEY: 'anon' })).toEqual({
      url: 'https://x.supabase.co',
      anonKey: 'anon',
    });
  });
});

describe('Gán slot tất định (FR-007-03)', () => {
  it('AC-007-02: 120 điều ước → treo 100 mới nhất, slot không trùng', () => {
    const rows = Array.from({ length: 120 }, () => row());
    const wishes = assignRemoteSlots(rows);
    expect(wishes).toHaveLength(100);
    expect(new Set(wishes.map((w) => w.slotId)).size).toBe(100);
    const newest = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
    expect(new Set(wishes.map((w) => w.id))).toEqual(new Set(newest.map((r) => r.id)));
    expect(wishes.every((w) => BRANCH_SLOTS.some((s) => s.id === w.slotId))).toBe(true);
  });

  it('AC-007-03: cùng dữ liệu, đảo thứ tự đầu vào → cùng kết quả', () => {
    const rows = Array.from({ length: 30 }, () => row());
    const a = assignRemoteSlots(rows);
    const b = assignRemoteSlots([...rows].reverse());
    const map = (ws: typeof a) => Object.fromEntries(ws.map((w) => [w.id, w.slotId]));
    expect(map(b)).toEqual(map(a));
  });

  it('AC-007-04: thêm điều ước mới nhất → điều ước cũ giữ nguyên slot', () => {
    const rows = Array.from({ length: 40 }, () => row());
    const before = Object.fromEntries(assignRemoteSlots(rows).map((w) => [w.id, w.slotId]));
    const after = assignRemoteSlots([...rows, row()]);
    for (const w of after) if (before[w.id]) expect(w.slotId).toBe(before[w.id]);
  });

  it('map sang Wish chuẩn của 002 (paperColor, createdAt, source)', () => {
    const r = row({ paper_color: 'blue', source: 'shared' });
    const [w] = assignRemoteSlots([r]);
    expect(w).toMatchObject({ id: r.id, paperColor: 'blue', source: 'shared', createdAt: r.created_at });
  });
});

describe('Owner token (FR-007-11)', () => {
  it('sinh token 32 byte base64url, lưu & đọc theo id', () => {
    const t = ownerTokens.create();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(ownerTokens.create()).not.toBe(t);
    ownerTokens.set('w1', t);
    expect(ownerTokens.get('w1')).toBe(t);
    expect(ownerTokens.has('w2')).toBe(false);
  });
});

describe('remoteRepository (6.1, 6.2)', () => {
  const backend = { url: 'https://proj.supabase.co', anonKey: 'anon-key' };
  afterEach(() => vi.restoreAllMocks());

  const respond = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

  it('list: đọc view công khai với anon key, sắp mới nhất trước', async () => {
    const f = respond(200, [row()]);
    const repo = createRemoteRepository(backend, f);
    const r = await repo.list(0, 100);
    expect(r.ok && r.value).toHaveLength(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://proj.supabase.co/rest/v1/public_wishes?select=*&order=created_at.desc&limit=100&offset=0');
    expect((init.headers as Record<string, string>).apikey).toBe('anon-key');
  });

  it('AC-007-06: create gửi ownerToken tới Edge Function', async () => {
    const created = row();
    const f = respond(201, { wish: created, quota: { used: 1, limit: 3, remaining: 2 } });
    const repo = createRemoteRepository(backend, f);
    const token = ownerTokens.create();
    const r = await repo.create({ content: 'x', author: 'y', category: 'other', paperColor: 'red' }, token);
    expect(r.ok && r.value.wish.id).toBe(created.id);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://proj.supabase.co/functions/v1/wishes');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ ownerToken: token, paperColor: 'red' });
  });

  it('AC-007-07: 429 → QUOTA_EXCEEDED', async () => {
    const repo = createRemoteRepository(backend, respond(429, { error: 'QUOTA_EXCEEDED', message: '...' }));
    const r = await repo.create({ content: 'x', author: 'y', category: 'other', paperColor: 'red' }, ownerTokens.create());
    expect(r).toEqual({ ok: false, error: 'QUOTA_EXCEEDED' });
  });

  it('ERR-007-02: lỗi mạng → NETWORK', async () => {
    const repo = createRemoteRepository(backend, vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    expect(await repo.quota()).toEqual({ ok: false, error: 'NETWORK' });
  });

  it('ERR-007-08: phản hồi sai định dạng → BAD_RESPONSE', async () => {
    const repo = createRemoteRepository(backend, respond(200, [{ id: 'x', hacked: true }]));
    expect(await repo.list()).toEqual({ ok: false, error: 'BAD_RESPONSE' });
  });

  it('FR-007-12: sửa / gỡ / khôi phục gửi ownerToken; 403 → FORBIDDEN, 410 → GONE', async () => {
    const f = respond(403, { error: 'FORBIDDEN' });
    const repo = createRemoteRepository(backend, f);
    expect(await repo.remove('id-1', 'tok')).toEqual({ ok: false, error: 'FORBIDDEN' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://proj.supabase.co/functions/v1/wishes/id-1');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ ownerToken: 'tok' });
    const repo2 = createRemoteRepository(backend, respond(410, { error: 'GONE' }));
    expect(await repo2.restore('id-1', 'tok')).toEqual({ ok: false, error: 'GONE' });
  });
});
