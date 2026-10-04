import "server-only";
import { config } from "@/lib/config";
import { AppError } from "@/lib/errors";
import type { AiProvider, AiRequest } from "./types";

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.ai.timeoutMs),
  });
  if (!res.ok) {
    throw new AppError("AI_FAILED", `status ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<unknown>;
}

/** Anthropic Messages API. */
export const anthropicProvider: AiProvider = {
  name: "anthropic",
  async generate({ system, messages }: AiRequest) {
    const data = (await postJson(
      `${config.ai.baseUrl || "https://api.anthropic.com"}/v1/messages`,
      { "x-api-key": config.ai.apiKey, "anthropic-version": "2023-06-01" },
      {
        model: config.ai.model || "claude-sonnet-5-5",
        max_tokens: config.ai.maxTokens,
        system,
        messages,
      },
    )) as { content?: { type: string; text?: string }[] };
    return (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
  },
};

/** Qualquer API compatível com OpenAI Chat Completions. */
export const openaiProvider: AiProvider = {
  name: "openai",
  async generate({ system, messages }: AiRequest) {
    const data = (await postJson(
      `${config.ai.baseUrl || "https://api.openai.com/v1"}/chat/completions`,
      { authorization: `Bearer ${config.ai.apiKey}` },
      {
        model: config.ai.model || "gpt-4o-mini",
        max_tokens: config.ai.maxTokens,
        messages: [{ role: "system", content: system }, ...messages],
      },
    )) as { choices?: { message?: { content?: string } }[] };
    return (data.choices?.[0]?.message?.content ?? "").trim();
  },
};
