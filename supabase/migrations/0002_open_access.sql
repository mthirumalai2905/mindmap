-- Open access: no sign-in. Anyone with the project URL and publishable key
-- can read and write every workspace. Row-level security stays enabled with
-- explicit permissive policies so access can be tightened later by replacing
-- these policies (see 0001 for the member-based versions).

alter table public.workspaces alter column created_by set default null;

drop policy if exists workspaces_select on public.workspaces;
drop policy if exists workspaces_insert on public.workspaces;
drop policy if exists workspaces_update on public.workspaces;
drop policy if exists workspaces_delete on public.workspaces;
drop policy if exists workspaces_open on public.workspaces;
create policy workspaces_open on public.workspaces for all to anon, authenticated using (true) with check (true);

do $$
declare
  t text;
begin
  foreach t in array array['products','categories','map_nodes','map_edges','content_items','initiatives','research_ideas','tasks','characters','story_arcs','comic_issues','lore_entries','relationships','activity_log'] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_open', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', t || '_open', t);
    execute format('grant select, insert, update, delete on public.%I to anon', t);
  end loop;
end $$;

grant select, insert, update, delete on public.workspaces to anon;
-- Membership is unused without sign-in; keep it closed to API clients.
revoke all on public.workspace_members from anon;
drop function if exists public.join_workspace(text);
