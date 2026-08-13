-- Accept memorable Bible-word invite codes while preserving uniqueness.
create or replace function public.create_group(p_code text, p_name text, p_group_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if lower(trim(p_code)) !~ '^[a-z]{3,10}[0-9]{2}$' then
    raise exception 'Invite code must contain one Bible word and two digits';
  end if;
  insert into public.profiles(id, name, last_seen) values(auth.uid(), left(trim(p_name), 80), now())
    on conflict(id) do update set name = excluded.name, last_seen = now();
  insert into public.groups(name, code, admin_name)
    values(left(trim(p_group_name), 80), lower(trim(p_code)), left(trim(p_name), 80))
    returning id into gid;
  insert into public.memberships(group_id, user_id) values(gid, auth.uid());
  return gid;
exception when unique_violation then
  raise exception 'Invite code collision; generate a new code';
end;
$$;
revoke all on function public.create_group(text, text, text) from public;
grant execute on function public.create_group(text, text, text) to authenticated;
