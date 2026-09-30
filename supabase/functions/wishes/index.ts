// Edge Function `wishes` (007): mọi thao tác GHI lên cây ước nguyện chung.
// Deploy: npx supabase functions deploy wishes --no-verify-jwt
// Secrets: IP_HASH_SALT (chuỗi ngẫu nhiên dài), ALLOWED_ORIGINS (phân tách bằng dấu phẩy)
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY do Supabase tự cung cấp cho function.

import {
  clientIp,
  corsHeaders,
  ERROR_MESSAGES,
  hmacSha256Hex,
  mapDbError,
  OWNER_TOKEN_RE,
  sha256Hex,
  validateWishInput,
  WISH_LIMIT_PER_IP,
} from '../_shared/logic.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SALT = Deno.env.get('IP_HASH_SALT') ?? '';
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

async function rpc(fn: string, args: Record<string, unknown>): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message = typeof body === 'object' && body && 'message' in body ? String((body as { message: unknown }).message) : text;
    return { ok: false, message };
  }
  return { ok: true, data: body };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'), ALLOWED);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
  const fail = (status: number, code: string) => json(status, { error: code, message: ERROR_MESSAGES[code] ?? code });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!SALT || !SERVICE_KEY) return fail(500, 'SERVER');

  // Đường dẫn sau /wishes: "", "/quota", "/<id>", "/<id>/restore"
  const path = new URL(req.url).pathname.replace(/^.*\/wishes/, '');
  const parts = path.split('/').filter(Boolean);

  const ip = clientIp(req.headers);
  if (!ip) return fail(400, 'NO_IP');
  const ipHash = await hmacSha256Hex(SALT, ip); // IP gốc không bao giờ được lưu hay log (NFR-007-02)

  const quotaOf = async () => {
    const r = await rpc('wish_quota', { p_ip_hash: ipHash });
    const used = r.ok ? Number(r.data) : 0;
    return { used, limit: WISH_LIMIT_PER_IP, remaining: Math.max(0, WISH_LIMIT_PER_IP - used) };
  };

  let body: unknown = null;
  if (req.method !== 'GET') {
    try {
      body = await req.json();
    } catch {
      return fail(422, 'VALIDATION');
    }
  }
  const token = typeof body === 'object' && body && 'ownerToken' in body ? String((body as { ownerToken: unknown }).ownerToken) : '';

  try {
    // GET /quota (FR-007-19)
    if (req.method === 'GET' && parts[0] === 'quota' && parts.length === 1) return json(200, await quotaOf());

    // POST / — tạo điều ước (FR-007-06..10)
    if (req.method === 'POST' && parts.length === 0) {
      const v = validateWishInput(body);
      if (!v.ok) return fail(422, v.error);
      const r = await rpc('create_wish', {
        p_content: v.data.content,
        p_author: v.data.author,
        p_category: v.data.category,
        p_paper_color: v.data.paperColor,
        p_source: v.data.source,
        p_owner_token_hash: await sha256Hex(v.data.ownerToken),
        p_ip_hash: ipHash,
        p_limit: WISH_LIMIT_PER_IP,
      });
      if (!r.ok) {
        const e = mapDbError(r.message);
        return fail(e.status, e.code);
      }
      const wish = Array.isArray(r.data) ? r.data[0] : r.data;
      return json(201, { wish, quota: await quotaOf() });
    }

    const id = parts[0] ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(id) || !OWNER_TOKEN_RE.test(token)) return fail(422, 'VALIDATION');
    const ownerHash = await sha256Hex(token);

    // PATCH /:id — sửa (FR-007-12)
    if (req.method === 'PATCH' && parts.length === 1) {
      const v = validateWishInput(body);
      if (!v.ok) return fail(422, v.error);
      const r = await rpc('update_wish', {
        p_id: id,
        p_owner_token_hash: ownerHash,
        p_content: v.data.content,
        p_author: v.data.author,
        p_category: v.data.category,
        p_paper_color: v.data.paperColor,
      });
      if (!r.ok) {
        const e = mapDbError(r.message);
        return fail(e.status, e.code);
      }
      return json(200, { wish: Array.isArray(r.data) ? r.data[0] : r.data });
    }

    // DELETE /:id — gỡ mềm (FR-007-13)
    if (req.method === 'DELETE' && parts.length === 1) {
      const r = await rpc('delete_wish', { p_id: id, p_owner_token_hash: ownerHash });
      if (!r.ok) {
        const e = mapDbError(r.message);
        return fail(e.status, e.code);
      }
      return json(200, { id });
    }

    // POST /:id/restore — hoàn tác trong 60 s
    if (req.method === 'POST' && parts.length === 2 && parts[1] === 'restore') {
      const r = await rpc('restore_wish', { p_id: id, p_owner_token_hash: ownerHash });
      if (!r.ok) {
        const e = mapDbError(r.message);
        return fail(e.status, e.code);
      }
      return json(200, { wish: Array.isArray(r.data) ? r.data[0] : r.data });
    }

    return fail(405, 'METHOD');
  } catch {
    return fail(500, 'SERVER');
  }
});
