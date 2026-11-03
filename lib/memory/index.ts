import "server-only";
import { config } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getAdminClient } from "@/lib/supabase/server";

export type MemoryKind = "fact" | "preference" | "document";

export interface Memory {
  id: string;
  kind: MemoryKind;
  content: string;
  source: string | null;
  similarity?: number;
}

export const isMemoryConfigured = () =>
  Boolean(config.embeddings.apiKey) && getAdminClient() !== null;

function requireClient() {
  if (!config.embeddings.apiKey) throw new AppError("NOT_CONFIGURED", "EMBEDDING_API_KEY ausente");
  const client = getAdminClient();
  if (!client) throw new AppError("NOT_CONFIGURED", "Supabase ausente");
  return client;
}

/** Embedding via endpoint compatível com OpenAI (/embeddings). */
export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${config.embeddings.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.embeddings.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.embeddings.model,
      input: text,
      dimensions: config.embeddings.dimensions,
    }),
    signal: AbortSignal.timeout(config.embeddings.timeoutMs),
  });
  if (!res.ok) {
    throw new AppError("MEMORY_FAILED", `embeddings ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { data?: { embedding?: number[] }[] };
  const vector = data.data?.[0]?.embedding;
  if (!vector || vector.length !== config.embeddings.dimensions) {
    throw new AppError("MEMORY_FAILED", "embedding inválido");
  }
  return vector;
}

export async function saveMemory(params: {
  userId: string | null;
  content: string;
  kind?: MemoryKind;
  source?: string;
}): Promise<string> {
  const client = requireClient();
  const embedding = await embed(params.content);
  const { data, error } = await client
    .from("memories")
    .insert({
      user_id: params.userId,
      kind: params.kind ?? "fact",
      content: params.content,
      source: params.source ?? null,
      embedding: JSON.stringify(embedding),
    })
    .select("id")
    .single();
  if (error) throw new AppError("MEMORY_FAILED", error.message);
  return data.id as string;
}

export async function searchMemories(params: {
  userId: string | null;
  query: string;
  limit?: number;
}): Promise<Memory[]> {
  const client = requireClient();
  const embedding = await embed(params.query);
  const { data, error } = await client.rpc("match_memories", {
    query_embedding: JSON.stringify(embedding),
    p_user_id: params.userId,
    match_count: params.limit ?? config.limits.memoriesPerReply,
  });
  if (error) throw new AppError("MEMORY_FAILED", error.message);
  return (data ?? []) as Memory[];
}

/** Remove uma memória, mas só se for do mesmo dono. Retorna false se não existir. */
export async function deleteMemory(userId: string | null, id: string): Promise<boolean> {
  const client = requireClient();
  let query = client.from("memories").delete().eq("id", id);
  query = userId ? query.eq("user_id", userId) : query.is("user_id", null);
  const { data, error } = await query.select("id");
  if (error) throw new AppError("MEMORY_FAILED", error.message);
  return (data ?? []).length > 0;
}

/**
 * Memórias relevantes para a fala do usuário, para o chat. Melhor esforço:
 * qualquer falha é registrada e a conversa segue sem memória.
 */
export async function recallForChat(userId: string | null, message: string): Promise<Memory[]> {
  if (!isMemoryConfigured()) return [];
  try {
    return await searchMemories({ userId, query: message });
  } catch (e) {
    logger.error("memory_recall_failed", { detail: e instanceof Error ? e.message : "unknown" });
    return [];
  }
}
