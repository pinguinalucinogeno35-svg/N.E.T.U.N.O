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
