import "server-only";

/**
 * Configuração server-side. Nenhuma destas variáveis tem prefixo NEXT_PUBLIC_,
 * portanto nunca entram no bundle do navegador.
 */
export const config = {
  ai: {
    provider: (process.env.AI_PROVIDER ?? "anthropic") as "anthropic" | "openai",
    apiKey: process.env.AI_API_KEY ?? "",
    model: process.env.AI_MODEL ?? "",
    baseUrl: process.env.AI_BASE_URL ?? "",
    maxTokens: 700,
    timeoutMs: 30_000,
  },
  stt: {
    provider: process.env.STT_PROVIDER ?? "openai",
    apiKey: process.env.STT_API_KEY ?? "",
    model: process.env.STT_MODEL ?? "whisper-1",
    baseUrl: process.env.STT_BASE_URL ?? "https://api.openai.com/v1",
    language: process.env.STT_LANGUAGE ?? "pt",
    timeoutMs: 30_000,
  },
  tts: {
    provider: process.env.TTS_PROVIDER ?? "openai",
    apiKey: process.env.TTS_API_KEY ?? "",
    model: process.env.TTS_MODEL ?? "tts-1",
    voice: process.env.TTS_VOICE ?? "nova",
    speed: Number(process.env.TTS_SPEED ?? "1"),
    baseUrl: process.env.TTS_BASE_URL ?? "https://api.openai.com/v1",
    timeoutMs: 30_000,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  /** Quando "true", as rotas exigem um usuário autenticado no Supabase. */
  requireAuth: process.env.JARVIS_REQUIRE_AUTH === "true",
  limits: {
    maxAudioBytes: 10 * 1024 * 1024,
    maxMessageChars: 2_000,
    maxSpeechChars: 3_000,
    maxHistoryItems: 20,
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? "30"),
  },
} as const;
