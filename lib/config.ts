import "server-only";

/**
 * Configuração server-side. Nenhuma destas variáveis tem prefixo NEXT_PUBLIC_,
 * portanto nunca entram no bundle do navegador.
 */
function build() {
  return {
  ai: {
    // Sem AI_PROVIDER: usa Anthropic se houver AI_API_KEY; senão Cloudflare Workers AI (grátis, sem chave).
    provider: (process.env.AI_PROVIDER ??
      (process.env.AI_API_KEY ? "anthropic" : "workers-ai")) as "anthropic" | "openai" | "workers-ai",
    apiKey: process.env.AI_API_KEY ?? "",
    model: process.env.AI_MODEL ?? "",
    baseUrl: process.env.AI_BASE_URL ?? "",
    maxTokens: 700,
    timeoutMs: 30_000,
  },
  stt: {
    // Sem STT_PROVIDER: OpenAI se houver STT_API_KEY; senão Workers AI (Whisper, grátis, sem chave).
    provider: process.env.STT_PROVIDER ?? (process.env.STT_API_KEY ? "openai" : "workers-ai"),
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
  embeddings: {
    // Grátis: Workers AI (binding AI). bge-m3 é multilíngue e gera 1024 dimensões (coluna vector(1024)).
    model: process.env.EMBEDDING_MODEL ?? "@cf/baai/bge-m3",
    dimensions: 1024,
    /** Acima disso, a memória nova é considerada repetida e não é gravada. */
    duplicateSimilarity: 0.88,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  /**
   * Exige um usuário autenticado no Supabase nas rotas /api. Ligado por padrão
   * em produção (falha fechada); desligue só explicitamente com
   * JARVIS_REQUIRE_AUTH=false (ex.: desenvolvimento local sem Supabase).
   */
  requireAuth:
    process.env.JARVIS_REQUIRE_AUTH === "true" ||
    (process.env.JARVIS_REQUIRE_AUTH !== "false" && process.env.NODE_ENV === "production"),
  limits: {
    maxAudioBytes: 10 * 1024 * 1024,
    maxMessageChars: 2_000,
    maxSpeechChars: 3_000,
    maxHistoryItems: 20,
    maxMemoryChars: 4_000,
    memoriesPerReply: 5,
    maxAutoMemoriesPerTurn: 3,
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? "30"),
  },
} as const;
}

/**
 * Lido a cada acesso (não no import): no Cloudflare Workers o process.env só é
 * preenchido durante a requisição, então valores congelados no carregamento do
 * módulo ficariam vazios.
 */
export const config = new Proxy({} as ReturnType<typeof build>, {
  get: (_t, key) => build()[key as keyof ReturnType<typeof build>],
});
