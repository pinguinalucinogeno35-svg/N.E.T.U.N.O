import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { AppError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { guard } from "@/lib/security";
import { getSttProvider } from "@/lib/speech";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_TYPES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/aac"];
const EXT: Record<string, string> = {
  "audio/webm": "webm", "audio/mp4": "mp4", "audio/ogg": "ogg", "audio/mpeg": "mp3",
  "audio/wav": "wav", "audio/x-m4a": "m4a", "audio/aac": "aac",
};

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    await guard(req);
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > config.limits.maxAudioBytes + 4096) throw new AppError("PAYLOAD_TOO_LARGE");

    const form = await req.formData().catch(() => {
      throw new AppError("BAD_REQUEST", "multipart inválido");
    });
    const file = form.get("audio");
    if (!(file instanceof Blob)) throw new AppError("BAD_REQUEST", "campo 'audio' ausente");
    if (file.size === 0) throw new AppError("BAD_REQUEST", "áudio vazio");
    if (file.size > config.limits.maxAudioBytes) throw new AppError("PAYLOAD_TOO_LARGE");

    const baseType = file.type.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.includes(baseType)) throw new AppError("UNSUPPORTED_MEDIA", baseType);

    const text = await getSttProvider().transcribe({
      audio: file,
      filename: `audio.${EXT[baseType]}`,
      language: config.stt.language,
    });
    logger.info("transcribe_ok", { bytes: file.size, ms: Date.now() - started });
    return NextResponse.json({ text });
  } catch (err) {
    return errorResponse(err, "transcribe");
  }
}
