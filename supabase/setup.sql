-- Chạy một lần trong Supabase → SQL Editor.
create table if not exists public.game_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Bò nhỏ' check (length(display_name) between 1 and 24),
  progression jsonb not null default '{"version":5,"totalXp":0,"lifetimeXp":0,"skills":{},"ownedSkins":["classic"],"selectedSkin":"classic"}'::jsonb,
  kills bigint not null default 0 check (kills between 0 and 1000000000),
  deaths bigint not null default 0 check (deaths between 0 and 1000000000),
  damage bigint not null default 0 check (damage between 0 and 100000000000),
  last_room jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.game_profiles enable row level security;
revoke all on public.game_profiles from anon, authenticated;
grant select on public.game_profiles to authenticated;
drop policy if exists "Đọc dữ liệu của mình" on public.game_profiles;
create policy "Đọc dữ liệu của mình" on public.game_profiles for select to authenticated using ((select auth.uid()) = user_id);

-- Ghi qua RPC, khóa hàng và kiểm tra revision để hai tab không ghi đè nhau.
create or replace function public.save_game_profile(p_profile jsonb, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_row public.game_profiles;
  v_progress jsonb := p_profile->'progression';
  v_key text;
  v_total bigint;
  v_lifetime bigint;
  v_level integer := 1;
  v_remaining bigint;
  v_spent integer := 0;
  v_rank integer;
  v_skin text;
  v_skin_xp bigint;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Cần đăng nhập tài khoản để lưu' using errcode = '42501';
  end if;
  if jsonb_typeof(p_profile) <> 'object' or octet_length(p_profile::text) > 20000 or jsonb_typeof(v_progress) <> 'object' then
    raise exception 'Dữ liệu không hợp lệ' using errcode = '22023';
  end if;
  v_total := coalesce((v_progress->>'totalXp')::bigint, 0);
  v_lifetime := coalesce((v_progress->>'lifetimeXp')::bigint, 0);
  if v_total < 0 or v_total > 1000000000 or v_lifetime < v_total or v_lifetime > 1000000000 then
    raise exception 'XP không hợp lệ' using errcode = '22023';
  end if;
  v_remaining := v_total;
  while v_level < 21 and v_remaining >= 180 + (v_level - 1) * 120 loop
    v_remaining := v_remaining - (180 + (v_level - 1) * 120);
    v_level := v_level + 1;
  end loop;
  foreach v_key in array array['grazing','power','armor','endurance'] loop
    v_rank := coalesce((v_progress->'skills'->>v_key)::integer, 0);
    if v_rank < 0 or v_rank > 5 then raise exception 'Bậc kỹ năng không hợp lệ' using errcode = '22023'; end if;
    v_spent := v_spent + v_rank;
  end loop;
  if v_spent > v_level - 1 then raise exception 'Không đủ điểm kỹ năng' using errcode = '22023'; end if;
  if jsonb_typeof(v_progress->'ownedSkins') <> 'array' then raise exception 'Skin không hợp lệ' using errcode = '22023'; end if;
  for v_skin in select jsonb_array_elements_text(v_progress->'ownedSkins') loop
    v_skin_xp := case v_skin when 'classic' then 0 when 'strawberry' then 480 when 'chocolate' then 1440 when 'matcha' then 2880 when 'sky' then 4800 when 'lavender' then 7200 when 'golden' then 10080 else null end;
    if v_skin_xp is null or v_lifetime < v_skin_xp then raise exception 'Skin chưa được mở' using errcode = '22023'; end if;
  end loop;
  if not (v_progress->'ownedSkins' ? coalesce(v_progress->>'selectedSkin','classic')) then raise exception 'Chưa sở hữu skin' using errcode = '22023'; end if;
  insert into public.game_profiles(user_id) values(v_uid) on conflict(user_id) do nothing;
  select * into v_row from public.game_profiles where user_id = v_uid for update;
  if v_row.revision <> p_expected_revision then raise exception 'Dữ liệu đã thay đổi ở phiên khác' using errcode = '40001'; end if;
  if v_lifetime < coalesce((v_row.progression->>'lifetimeXp')::bigint,0) then raise exception 'Không giảm XP sưu tầm' using errcode = '22023'; end if;
  if coalesce((p_profile->>'kills')::bigint,0) < v_row.kills or coalesce((p_profile->>'deaths')::bigint,0) < v_row.deaths or coalesce((p_profile->>'damage')::bigint,0) < v_row.damage then raise exception 'Không giảm điểm tích lũy' using errcode = '22023'; end if;
  update public.game_profiles set
    display_name = left(coalesce(nullif(trim(p_profile->>'display_name'),''),'Bò nhỏ'),24),
    progression = v_progress,
    kills = coalesce((p_profile->>'kills')::bigint,0), deaths = coalesce((p_profile->>'deaths')::bigint,0), damage = coalesce((p_profile->>'damage')::bigint,0),
    last_room = p_profile->'last_room', revision = revision + 1, updated_at = now()
  where user_id = v_uid returning * into v_row;
  return to_jsonb(v_row);
end;
$$;
revoke all on function public.save_game_profile(jsonb,bigint) from public, anon;
grant execute on function public.save_game_profile(jsonb,bigint) to authenticated;

-- Top chỉ công bố tên trong game và điểm, không công bố email hoặc dữ liệu riêng.
create or replace function public.get_game_top()
returns table(user_id uuid, display_name text, kills bigint, deaths bigint, damage bigint)
language sql stable security definer set search_path = '' as $$
  select user_id, display_name, kills, deaths, damage from public.game_profiles
  where kills > 0 or damage > 0 order by kills desc, damage desc, updated_at asc limit 10;
$$;
revoke all on function public.get_game_top() from public;
grant execute on function public.get_game_top() to anon, authenticated;

-- Chơi khách dùng Anonymous Auth. Các kênh game yêu cầu phiên đăng nhập.
-- Phòng dùng mã mời để tổ chức team, chưa có mật khẩu/phân quyền từng phòng.
drop policy if exists "Đọc kênh game" on realtime.messages;
drop policy if exists "Gửi vào kênh game" on realtime.messages;
create policy "Đọc kênh game" on realtime.messages for select to authenticated
using ((select auth.uid()) is not null and ((select realtime.topic()) like 'cow-room:%' or (select realtime.topic()) like 'cow-input:%'));
create policy "Gửi vào kênh game" on realtime.messages for insert to authenticated
with check ((select auth.uid()) is not null and ((select realtime.topic()) like 'cow-room:%' or (select realtime.topic()) like 'cow-input:%'));