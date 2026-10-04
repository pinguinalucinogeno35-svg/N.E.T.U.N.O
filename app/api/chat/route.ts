import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { askJarvis } from "@/lib/ai";
import { config } from "@/lib/config";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { guard } from "@/lib/security";
import { loadHistory, saveExchange } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 45;

const bodySchema = z.object({
  message: z.string().trim().min(1).max(config.limits.maxMessageChars),
  conversationId: z.uuid().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(config.limits.maxMessageChars * 2),
      }),
    )
    .max(config.limits.maxHistoryItems)
    .optional(),
});

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const user = await guard(req);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("BAD_REQUEST", parsed.error.message);
    const { message, conversationId, history } = parsed.data;

    // Prefere o histórico persistido (confiável); senão usa o enviado pelo cliente.
    const stored = conversationId
      ? await loadHistory(user.id, conversationId, config.limits.maxHistoryItems)
      : null;
    const context = stored ?? history ?? [];

    const reply = await askJarvis(context, message);
    const savedId = await saveExchange({
      userId: user.id,
      conversationId,
      userText: message,
      assistantText: reply,
    });
    logger.info("chat_ok", { ms: Date.now() - started, persisted: Boolean(savedId) });
    return NextResponse.json({ reply, conversationId: savedId ?? conversationId });
  } catch (err) {
    return errorResponse(err, "chat");
  }
}
