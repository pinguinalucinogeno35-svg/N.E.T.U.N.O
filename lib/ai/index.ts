import "server-only";
import { config } from "@/lib/config";
import { AppError } from "@/lib/errors";
import type { HistoryItem } from "@/types";
import { anthropicProvider, openaiProvider } from "./providers";
import { JARVIS_SYSTEM_PROMPT } from "./system-prompt";
import type { AiMessage, AiProvider } from "./types";

function getProvider(): AiProvider {
  if (!config.ai.apiKey) {
    throw new AppError("NOT_CONFIGURED", "AI_API_KEY ausente");
  }
  return config.ai.provider === "openai" ? openaiProvider : anthropicProvider;
}

/** Remove mensagens `system`, garante que começa com `user` e alterna papéis. */
export function normalizeMessages(history: HistoryItem[], userMessage: string): AiMessage[] {
  const out: AiMessage[] = [];
  for (const item of [...history, { role: "user" as const, content: userMessage }]) {
    if (item.role === "system" || !item.content.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === item.role) last.content += `\n${item.content}`;
    else out.push({ role: item.role, content: item.content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

/** Único ponto de entrada para o modelo de linguagem em toda a aplicação. */
export async function askJarvis(history: HistoryItem[], userMessage: string): Promise<string> {
  const provider = getProvider();
  const reply = await provider.generate({
    system: JARVIS_SYSTEM_PROMPT,
    messages: normalizeMessages(history, userMessage),
  });
  if (!reply) throw new AppError("AI_FAILED", "resposta vazia");
  return reply;
}
