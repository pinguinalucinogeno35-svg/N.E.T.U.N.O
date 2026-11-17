-- JARVIS — "mega brain": memórias com busca semântica (pgvector).
create extension if not exists vector with schema extensions;

-- user_id é anulável no MVP (sem login), igual a conversations.
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  kind text not null default 'fact' check (kind in ('fact', 'preference', 'document')),
  content text not null,
  source text,
  -- Dimensão final (1024, bge-m3) vem da migração 0004.
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now()
);
create index if not exists memories_user_idx on public.memories (user_id, created_at desc);
create index if not exists memories_embedding_idx
  on public.memories using hnsw (embedding extensions.vector_cosine_ops);

alter table public.memories enable row level security;

create policy "memories: dono" on public.memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Busca por similaridade de cosseno. Só o backend (service-role) pode chamar:
-- o user_id é argumento, então liberar para anon/authenticated permitiria ler memórias alheias.
create or replace function public.match_memories(
  query_embedding extensions.vector(1536),
  p_user_id uuid,
  match_count int default 5,
  min_similarity float default 0.3
) returns table (id uuid, kind text, content text, source text, similarity float)
language sql stable set search_path = public, extensions as $$
  select m.id, m.kind, m.content, m.source,
         1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where m.user_id is not distinct from p_user_id
    and 1 - (m.embedding <=> query_embedding) >= min_similarity
  order by m.embedding <=> query_embedding
  limit least(match_count, 20)
$$;

revoke execute on function public.match_memories(extensions.vector, uuid, int, float) from public, anon, authenticated;
grant execute on function public.match_memories(extensions.vector, uuid, int, float) to service_role;
