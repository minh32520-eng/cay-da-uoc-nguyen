-- 007-shared-wishes: cây ước nguyện chung + giới hạn 3 điều ước mỗi IP
-- IP chỉ lưu dạng HMAC-SHA256 (tính ở Edge Function); owner token chỉ lưu SHA-256.

create extension if not exists pgcrypto;

create table if not exists public.wishes (
  id               uuid primary key default gen_random_uuid(),
  content          text not null check (char_length(btrim(content)) between 1 and 400),
  author           text not null check (char_length(btrim(author)) between 1 and 60),
  category         text not null check (category in ('family','study','health','love','career','other')),
  paper_color      text not null check (paper_color in ('red','yellow','pink','green','blue')),
  source           text not null default 'local' check (source in ('local','shared')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  owner_token_hash text not null check (owner_token_hash ~ '^[0-9a-f]{64}$'),
  ip_hash          text not null check (ip_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists wishes_visible_created_idx on public.wishes (created_at desc) where deleted_at is null;
create index if not exists wishes_ip_hash_idx on public.wishes (ip_hash);

-- Không ai đọc/ghi trực tiếp bảng bằng anon key (FR-007-18): bật RLS và không tạo policy nào.
alter table public.wishes enable row level security;
revoke all on table public.wishes from anon, authenticated;

-- View công khai: chỉ các cột an toàn, bỏ điều ước đã gỡ
create or replace view public.public_wishes as
  select id, content, author, category, paper_color, source, created_at, updated_at
  from public.wishes
  where deleted_at is null;

grant select on public.public_wishes to anon;
grant select on public.public_wishes to authenticated;

-- ---------- RPC: chỉ Edge Function (service_role) được gọi ----------

-- Tạo điều ước: khoá theo bản băm IP trong giao dịch rồi mới đếm (FR-007-08, FR-007-09)
create or replace function public.create_wish(
  p_content text, p_author text, p_category text, p_paper_color text, p_source text,
  p_owner_token_hash text, p_ip_hash text, p_limit int default 3
) returns setof public.public_wishes
language plpgsql security definer set search_path = public as $$
declare
  v_used int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  select count(*) into v_used from public.wishes where ip_hash = p_ip_hash;
  if v_used >= p_limit then
    raise exception 'QUOTA_EXCEEDED' using errcode = 'P0001';
  end if;
  insert into public.wishes (content, author, category, paper_color, source, owner_token_hash, ip_hash)
  values (p_content, p_author, p_category, p_paper_color, p_source, p_owner_token_hash, p_ip_hash)
  returning id into v_id;
  return query select * from public.public_wishes where id = v_id;
end;
$$;

-- Số lượt đã dùng của một IP (tính cả điều ước đã gỡ)
create or replace function public.wish_quota(p_ip_hash text) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.wishes where ip_hash = p_ip_hash;
$$;

-- Kiểm tra quyền sở hữu dùng chung cho sửa / gỡ / khôi phục
create or replace function public.update_wish(
  p_id uuid, p_owner_token_hash text,
  p_content text, p_author text, p_category text, p_paper_color text
) returns setof public.public_wishes
language plpgsql security definer set search_path = public as $$
declare
  v_owner text;
begin
  select owner_token_hash into v_owner from public.wishes where id = p_id and deleted_at is null;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_owner <> p_owner_token_hash then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  update public.wishes
     set content = p_content, author = p_author, category = p_category, paper_color = p_paper_color, updated_at = now()
   where id = p_id;
  return query select * from public.public_wishes where id = p_id;
end;
$$;

-- Gỡ = xoá mềm; vẫn tính vào lượt của IP (FR-007-13)
create or replace function public.delete_wish(p_id uuid, p_owner_token_hash text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_owner text;
begin
  select owner_token_hash into v_owner from public.wishes where id = p_id and deleted_at is null;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_owner <> p_owner_token_hash then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  update public.wishes set deleted_at = now() where id = p_id;
  return p_id;
end;
$$;

-- Khôi phục trong vòng 60 giây sau khi gỡ
create or replace function public.restore_wish(p_id uuid, p_owner_token_hash text) returns setof public.public_wishes
language plpgsql security definer set search_path = public as $$
declare
  v_owner text;
  v_deleted timestamptz;
begin
  select owner_token_hash, deleted_at into v_owner, v_deleted from public.wishes where id = p_id;
  if not found or v_deleted is null then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_owner <> p_owner_token_hash then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  if v_deleted < now() - interval '60 seconds' then raise exception 'GONE' using errcode = 'P0001'; end if;
  update public.wishes set deleted_at = null, updated_at = now() where id = p_id;
  return query select * from public.public_wishes where id = p_id;
end;
$$;

revoke all on function public.create_wish(text, text, text, text, text, text, text, int) from public, anon, authenticated;
revoke all on function public.wish_quota(text) from public, anon, authenticated;
revoke all on function public.update_wish(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_wish(uuid, text) from public, anon, authenticated;
revoke all on function public.restore_wish(uuid, text) from public, anon, authenticated;

grant execute on function public.create_wish(text, text, text, text, text, text, text, int) to service_role;
grant execute on function public.wish_quota(text) to service_role;
grant execute on function public.update_wish(uuid, text, text, text, text, text) to service_role;
grant execute on function public.delete_wish(uuid, text) to service_role;
grant execute on function public.restore_wish(uuid, text) to service_role;
