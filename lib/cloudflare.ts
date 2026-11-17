import "server-only";
import { AppError } from "@/lib/errors";

/** Subconjunto do binding Workers AI que usamos. */
export interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

/** Binding `AI` do Cloudflare Workers (wrangler.jsonc). Indisponível em `next dev` puro. */
export async function getAiBinding(): Promise<AiBinding> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ai = (getCloudflareContext().env as { AI?: AiBinding }).AI;
    if (ai) return ai;
  } catch {
    // fora do runtime da Cloudflare
  }
  throw new AppError("NOT_CONFIGURED", "binding Workers AI indisponível (use o deploy na Cloudflare)");
}

/** Modelos de texto do Workers AI, do preferido ao reserva. O Cloudflare aposenta modelos antigos; por isso há reservas. */
export const CHAT_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/google/gemma-4-26b-a4b-it",
];

function extractText(out: unknown): string {
  const o = out as {
    response?: unknown;
    result?: { response?: unknown };
    choices?: { message?: { content?: unknown } }[];
  } | null;
  const candidates = [o?.response, o?.result?.response, o?.choices?.[0]?.message?.content];
  for (const c of candidates) if (typeof c === "string" && c.trim()) return c.trim();
  return "";
}

/** Conversa com o Workers AI tentando cada modelo até um responder. */
export async function runChat(
  ai: AiBinding,
  messages: { role: string; content: string }[],
  maxTokens: number,
  preferredModel?: string,
): Promise<string> {
  const models = [...new Set([preferredModel, ...CHAT_MODELS].filter((m): m is string => Boolean(m)))];
  const errors: string[] = [];
  for (const model of models) {
    try {
      const text = extractText(await ai.run(model, { max_tokens: maxTokens, messages }));
      if (text) return text;
      errors.push(`${model}: resposta vazia`);
    } catch (err) {
      errors.push(`${model}: ${String(err).slice(0, 120)}`);
    }
  }
  throw new AppError("AI_FAILED", errors.join(" | ").slice(0, 500));
}
