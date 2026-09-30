import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(__dirname, 'migrations');
const sql = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(dir, f), 'utf8'))
  .join('\n')
  .toLowerCase();

describe('Migration Supabase (007)', () => {
  it('AC-007-15: RLS bật, view công khai không lộ cột băm, RPC chỉ cho service_role', () => {
    expect(sql).toMatch(/alter table public\.wishes enable row level security/);
    const view = /create (or replace )?view public\.public_wishes[\s\S]*?;/.exec(sql)?.[0] ?? '';
    expect(view).not.toBe('');
    expect(view).not.toContain('ip_hash');
    expect(view).not.toContain('owner_token_hash');
    expect(view).toContain('deleted_at is null');
    expect(sql).toMatch(/grant select on public\.public_wishes to anon/);
    for (const fn of ['create_wish', 'update_wish', 'delete_wish', 'restore_wish', 'wish_quota']) {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`));
    }
  });

  it('AC-007-16: create_wish khoá theo bản băm IP trước khi đếm (chống vượt giới hạn khi gửi đồng thời)', () => {
    const fn = /create or replace function public\.create_wish[\s\S]*?\$\$;/.exec(sql)?.[0] ?? '';
    const lock = fn.indexOf('pg_advisory_xact_lock');
    const count = fn.indexOf('count(*)');
    expect(lock).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(lock);
    expect(fn).toContain('quota_exceeded');
  });

  it('FR-007-10: có ràng buộc CHECK cho dữ liệu', () => {
    expect(sql).toMatch(/category in \('family','study','health','love','career','other'\)/);
    expect(sql).toMatch(/paper_color in \('red','yellow','pink','green','blue'\)/);
    expect(sql).toMatch(/ip_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
  });
});
