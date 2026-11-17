-- Login obrigatório: toda conversa nova precisa de dono.
-- NOT VALID mantém conversas anônimas antigas (se existirem) sem bloquear a migração,
-- mas rejeita qualquer INSERT/UPDATE novo sem user_id. Depois de limpar ou atribuir
-- as antigas, rode: alter table public.conversations validate constraint conversations_user_required;
alter table public.conversations
  add constraint conversations_user_required check (user_id is not null) not valid;
