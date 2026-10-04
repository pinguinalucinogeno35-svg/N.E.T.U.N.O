import "server-only";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA"
  | "NOT_CONFIGURED"
  | "UPSTREAM_TIMEOUT"
  | "STT_FAILED"
  | "AI_FAILED"
  | "TTS_FAILED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
  NOT_CONFIGURED: 503,
  UPSTREAM_TIMEOUT: 504,
  STT_FAILED: 502,
  AI_FAILED: 502,
  TTS_FAILED: 502,
  INTERNAL: 500,
};

/** Mensagens seguras para o usuário final (sem detalhes técnicos). */
const USER_MESSAGE: Record<ErrorCode, string> = {
  BAD_REQUEST: "Não consegui entender a requisição.",
  UNAUTHORIZED: "Você precisa entrar para usar o JARVIS.",
  RATE_LIMITED: "Muitas requisições. Aguarde alguns segundos.",
  PAYLOAD_TOO_LARGE: "O áudio é grande demais. Fale por menos tempo.",
  UNSUPPORTED_MEDIA: "Formato de áudio não suportado.",
  NOT_CONFIGURED: "Este recurso ainda não foi configurado no servidor.",
  UPSTREAM_TIMEOUT: "O serviço demorou demais para responder.",
  STT_FAILED: "Não consegui transcrever o áudio.",
  AI_FAILED: "O JARVIS não conseguiu gerar uma resposta agora.",
  TTS_FAILED: "Não consegui gerar a voz da resposta.",
  INTERNAL: "Algo deu errado. Tente novamente.",
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    /** Detalhe técnico: vai apenas para os logs. */
    public detail?: string,
  ) {
    super(detail ?? code);
  }
}

export function errorResponse(err: unknown, route: string) {
  const appErr =
    err instanceof AppError
      ? err
      : err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")
        ? new AppError("UPSTREAM_TIMEOUT", err.message)
        : new AppError("INTERNAL", err instanceof Error ? err.message : "unknown");

  logger.error("route_error", { route, code: appErr.code, detail: appErr.detail });
  return NextResponse.json(
    { error: { code: appErr.code, message: USER_MESSAGE[appErr.code] } },
    { status: STATUS[appErr.code] },
  );
}
