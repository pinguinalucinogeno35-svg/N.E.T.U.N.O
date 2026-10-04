import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { HistoryItem } from "@/types";

let admin: SupabaseClient | null = null;

/** Cliente com service-role. Existe SOMENTE no servidor e nunca é importado por componentes. */
export function getAdminClient(): SupabaseClient | null {
  const { url, serviceRoleKey } = config.supabase;
  if (!url || !serviceRoleKey) return null;
  admin ??= createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return admin;
}

export const isSupabaseConfigured = () => getAdminClient() !== null;

export async function getUserFromToken(token: string): Promise<string | null> {
  const client = getAdminClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  return error ? null : (data.user?.id ?? null);
}

/**
 * Persiste a troca (usuário + assistente). Falhas do Supabase NUNCA derrubam a
 * conversa: são registradas e a resposta segue normalmente.
 */
export async function saveExchange(params: {
  userId: string | null;
  conversationId?: string;
  userText: string;
  assistantText: string;
}): Promise<string | undefined> {
  const client = getAdminClient();
  if (!client) return undefined;
  try {
    let conversationId = params.conversationId;
    if (conversationId) {
      const { data } = await client
        .from("conversations")
        .select("id, user_id")
        .eq("id", conversationId)
        .maybeSingle();
      // Só continua conversas do mesmo dono (ou anônimas, para anônimos).
      if (!data || (data.user_id ?? null) !== params.userId) conversationId = undefined;
    }
    if (!conversationId) {
      const { data, error } = await client
        .from("conversations")
        .insert({ user_id: params.userId, title: params.userText.slice(0, 60) })
        .select("id")
        .single();
      if (error) throw error;
      conversationId = data.id as string;
    }
    const { error } = await client.from("messages").insert([
      { conversation_id: conversationId, role: "user", content: params.userText },
      { conversation_id: conversationId, role: "assistant", content: params.assistantText },
    ]);
    if (error) throw error;
    await client
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    return conversationId;
  } catch (e) {
    logger.error("supabase_save_failed", { detail: e instanceof Error ? e.message : "unknown" });
    return undefined;
  }
}

export async function loadHistory(
  userId: string | null,
  conversationId: string,
  limit: number,
): Promise<HistoryItem[] | null> {
  const client = getAdminClient();
  if (!client) return null;
  try {
    const { data: conv } = await client
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv || (conv.user_id ?? null) !== userId) return null;
    const { data } = await client
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return ((data ?? []) as HistoryItem[]).reverse();
  } catch (e) {
    logger.error("supabase_load_failed", { detail: e instanceof Error ? e.message : "unknown" });
    return null;
  }
}
