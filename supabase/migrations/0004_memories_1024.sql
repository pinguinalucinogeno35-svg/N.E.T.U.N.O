-- Memória grátis: embeddings do Cloudflare Workers AI (@cf/baai/bge-m3) têm 1024 dimensões.
-- Troca a coluna de 1536 para 1024. Só roda se a tabela estiver vazia (senão aborta, sem perder nada).
do $$
begin
  if exists (select 1 from public.memories) then
    raise exception 'public.memories não está vazia; reindexe manualmente antes de trocar a dimensão';
  end if;
end $$;

drop function if exists public.match_memories(extensions.vector, uuid, int, float);
drop index if exists public.memories_embedding_idx;
alter table public.memories drop column embedding;
alter table public.memories add column embedding extensions.vector(1024) not null;
create index memories_embedding_idx
  on public.memories using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_memories(
  query_embedding extensions.vector(1024),
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
