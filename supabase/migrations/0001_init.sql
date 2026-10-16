-- Mindmap schema. Column names are the snake_case form of the TypeScript
-- record fields (see src/lib/types.ts) so the client can map rows generically.
--
-- Concurrency model: last write wins per record. Every save upserts whole
-- rows; Realtime broadcasts changes to other members, who apply a remote row
-- unless their own copy has a newer updated_at.
--
-- References between records (e.g. content -> product) are kept by the app,
-- not by foreign keys, so concurrent edits never make a save fail because
-- another member deleted the referenced record a moment earlier. Every row
-- does have a hard foreign key to its workspace.

create table if not exists public.workspaces (
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  status_labels jsonb not null default '{}'::jsonb,
  map_auto_layout boolean not null default true,
  join_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  created_by uuid not null default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workspaces alter column created_by drop not null;

create table if not exists public.workspace_members (
  workspace_id text not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members (user_id);

-- Shared columns for every record table.
create or replace function public._mm_base_columns() returns text language sql immutable as $$
  select 'id text primary key,
    workspace_id text not null references public.workspaces (id) on delete cascade,
    is_example boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()'
$$;

do $$
declare
  defs text[][] := array[
    ['products', 'slug text not null default '''', name text not null, kind text not null default ''product'', url text not null default '''', tagline text not null default '''', description text not null default '''', positioning text not null default '''', audience text not null default '''', goals text[] not null default ''{}'', research_questions text[] not null default ''{}'', "order" integer not null default 0'],
    ['categories', 'product_id text, name text not null, description text not null default '''', "order" integer not null default 0'],
    ['map_nodes', 'title text not null, description text not null default '''', kind text not null, parent_id text, product_id text, content_type text, status text, priority text, owner text not null default '''', due_date date, tags text[] not null default ''{}'', notes text not null default '''', next_actions text not null default '''', position jsonb not null default ''{"x":0,"y":0}'', collapsed boolean not null default false, "order" integer not null default 0'],
    ['map_edges', 'source text not null, target text not null, label text not null default '''''],
    ['content_items', 'title text not null, summary text not null default '''', product_id text, category_id text, content_type text not null, nature text not null default ''evergreen'', audience text not null default '''', objective text not null default '''', status text not null, priority text not null, owner text not null default '''', due_date date, publish_date date, tags text[] not null default ''{}'', urls text[] not null default ''{}'', body text not null default '''''],
    ['initiatives', 'name text not null, type text not null, objective text not null default '''', audience text not null default '''', product_id text, key_message text not null default '''', channels text[] not null default ''{}'', targets text[] not null default ''{}'', owner text not null default '''', priority text not null, status text not null, start_date date, end_date date, success_criteria text not null default '''', notes text not null default '''''],
    ['research_ideas', 'title text not null, product_id text, problem text not null default '''', target_user text not null default '''', alternatives text not null default '''', to_investigate text not null default '''', limitations text not null default '''', hypothesis text not null default '''', impact text not null default '''', feasibility text not null default ''unknown'', risks text not null default '''', experiment text not null default '''', success_criteria text not null default '''', evidence jsonb not null default ''[]'', decision text not null default ''undecided'', status text not null, priority text not null, owner text not null default '''', due_date date, tags text[] not null default ''{}'''],
    ['tasks', 'title text not null, description text not null default '''', product_id text, status text not null, priority text not null, owner text not null default '''', start_date date, due_date date, depends_on text[] not null default ''{}'''],
    ['characters', 'name text not null, role text not null default '''', background text not null default '''', motivations text not null default '''', abilities text not null default '''', "references" text[] not null default ''{}'', tags text[] not null default ''{}'''],
    ['story_arcs', 'title text not null, synopsis text not null default '''', themes text not null default '''', "order" integer not null default 0, status text not null'],
    ['comic_issues', 'title text not null, issue_number integer, synopsis text not null default '''', arc_id text, script_status text not null, art_status text not null, review_status text not null, publication_status text not null, publish_date date, script text not null default '''', "references" text[] not null default ''{}'''],
    ['lore_entries', 'title text not null, kind text not null, body text not null default '''', era text not null default '''', "order" integer not null default 0, "references" text[] not null default ''{}'', tags text[] not null default ''{}'''],
    ['relationships', 'a_type text not null, a_id text not null, b_type text not null, b_id text not null, label text not null default ''''']
  ];
  i int;
begin
  for i in 1 .. array_length(defs, 1) loop
    execute format('create table if not exists public.%I (%s, %s)', defs[i][1], public._mm_base_columns(), defs[i][2]);
    execute format('create index if not exists %I on public.%I (workspace_id)', defs[i][1] || '_workspace_idx', defs[i][1]);
  end loop;
end $$;

drop function public._mm_base_columns();

create index if not exists map_nodes_parent_idx on public.map_nodes (workspace_id, parent_id);
create index if not exists content_items_product_idx on public.content_items (workspace_id, product_id);
create index if not exists content_items_status_idx on public.content_items (workspace_id, status);
create index if not exists content_items_due_idx on public.content_items (workspace_id, due_date);
create index if not exists relationships_a_idx on public.relationships (workspace_id, a_type, a_id);
create index if not exists relationships_b_idx on public.relationships (workspace_id, b_type, b_id);
create unique index if not exists products_slug_uidx on public.products (workspace_id, slug);

create table if not exists public.activity_log (
  id text primary key,
  workspace_id text not null references public.workspaces (id) on delete cascade,
  at timestamptz not null default now(),
  action text not null,
  collection text not null,
  entity_id text not null,
  title text not null default ''
);
create index if not exists activity_log_workspace_at_idx on public.activity_log (workspace_id, at desc);

-- ------------------------------------------------------------------
-- Access control
-- ------------------------------------------------------------------

create or replace function public.is_member(ws text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m where m.workspace_id = ws and m.user_id = auth.uid())
$$;

create or replace function public.join_workspace(code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  ws text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  select id into ws from public.workspaces where join_code = upper(trim(code));
  if ws is null then
    raise exception 'No workspace matches that invite code';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, auth.uid(), 'editor')
  on conflict do nothing;
  return ws;
end $$;

revoke all on function public.join_workspace(text) from public, anon;
grant execute on function public.join_workspace(text) to authenticated;
revoke all on function public.is_member(text) from public, anon;
grant execute on function public.is_member(text) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_member(id) or created_by = auth.uid());
drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert on public.workspaces for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.is_member(id)) with check (public.is_member(id));
drop policy if exists workspaces_delete on public.workspaces;
create policy workspaces_delete on public.workspaces for delete to authenticated
  using (exists (select 1 from public.workspace_members m where m.workspace_id = id and m.user_id = auth.uid() and m.role = 'owner'));

drop policy if exists members_select on public.workspace_members;
create policy members_select on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(workspace_id));
drop policy if exists members_insert_owner on public.workspace_members;
create policy members_insert_owner on public.workspace_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = auth.uid())
  );
drop policy if exists members_delete_self on public.workspace_members;
create policy members_delete_self on public.workspace_members for delete to authenticated
  using (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array['products','categories','map_nodes','map_edges','content_items','initiatives','research_ideas','tasks','characters','story_arcs','comic_issues','lore_entries','relationships','activity_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_member_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id))',
      t || '_member_all', t
    );
    -- Full row images so Realtime delete events carry workspace_id for filtering.
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;

alter table public.workspaces replica identity full;

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ------------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['workspaces','products','categories','map_nodes','map_edges','content_items','initiatives','research_ideas','tasks','characters','story_arcs','comic_issues','lore_entries','relationships','activity_log'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
