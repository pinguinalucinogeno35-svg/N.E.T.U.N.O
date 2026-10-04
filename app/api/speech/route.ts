import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { guard } from "@/lib/security";
import { getTtsProvider } from "@/lib/speech";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  text: z.string().trim().min(1).max(config.limits.maxSpeechChars),
  voice: z.enum(["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]).optional(),
  speed: z.number().min(0.5).max(2).optional(),
});

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    await guard(req);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("BAD_REQUEST", parsed.error.message);

    const { audio, contentType } = await getTtsProvider().synthesize(parsed.data);
    logger.info("speech_ok", { chars: parsed.data.text.length, ms: Date.now() - started });
    return new NextResponse(audio, {
      headers: { "content-type": contentType, "cache-control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err, "speech");
  }
}
