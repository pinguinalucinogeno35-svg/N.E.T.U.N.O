# JARVIS — assistente pessoal de voz (PWA)

Assistente de voz em português brasileiro, acessível pelo navegador e instalável como PWA.

```
Microfone → Speech-to-Text → IA → Text-to-Speech → Áudio
```

## Arquitetura

```
app/
  page.tsx, layout.tsx, manifest.ts, globals.css
  api/transcribe/route.ts   POST áudio  → { text }
  api/chat/route.ts         POST mensagem → { reply, conversationId }
  api/speech/route.ts       POST texto  → áudio (mp3)
components/                 JarvisApp, JarvisOrb, VoiceButton, Conversation, StatusIndicator, TextComposer
hooks/useVoiceAssistant.ts  máquina de estados do fluxo de voz (única orquestração)
lib/
  ai/                       provedor de IA (providers.ts) + system-prompt.ts (personalidade, isolada)
  speech/                   provedores de STT e TTS (trocáveis)
  supabase/                 server.ts (service-role, só servidor) e browser.ts (anon key)
  client/                   api.ts, recorder.ts (MediaRecorder), audio-player.ts
  security.ts, errors.ts, logger.ts, config.ts
tools/                      contrato de ferramentas (READ/WRITE/DESTRUCTIVE) + pastas das integrações futuras
supabase/migrations/        esquema + RLS
public/sw.js, public/icons  PWA
```

Decisões importantes:

- **Chaves só no servidor.** Todas as chamadas a STT/IA/TTS acontecem nas rotas `/api/*`; `lib/config.ts` e os módulos de provedor usam `server-only`, então um import acidental no cliente quebra o build.
- **Provedores abstraídos.** `AiProvider`, `SttProvider`, `TtsProvider` (`lib/ai/types.ts`, `lib/speech/types.ts`). Padrão: Anthropic para IA e API compatível com OpenAI para STT/TTS. Para trocar, implemente a interface e selecione em `getProvider()` / `getSttProvider()` / `getTtsProvider()`.
- **Fallback de voz.** Se o TTS do servidor falhar ou não estiver configurado, o navegador fala com `speechSynthesis` (pt-BR).
- **Persistência tolerante a falhas.** Erro do Supabase é logado e nunca derruba a conversa.
- **Preparado para tempo real.** Toda a lógica de voz está em `useVoiceAssistant`; migrar para streaming (WebRTC/WebSocket) significa trocar as etapas internas mantendo a mesma interface pública.
- **Ferramentas.** `tools/types.ts` define o contrato e `tools/registry.ts` o executor, que exige escopo concedido e confirmação para `WRITE`/`DESTRUCTIVE`. Nenhuma ferramenta real é executada no MVP — o prompt proíbe o JARVIS de fingir ações.
- **Palavra de ativação ("Jarvis") — não implementada.** PWAs/navegadores móveis não garantem escuta em segundo plano (a aba precisa estar aberta e o iOS suspende o microfone). Uma versão futura só funcionaria com a página em primeiro plano ou com app nativo.

## Requisitos

Node.js 20+ e npm. Contas/chaves: um provedor de IA (Anthropic ou compatível com OpenAI) e um de STT/TTS (OpenAI ou compatível). Supabase é opcional no MVP.

## Instalação e execução

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev                  # http://localhost:3000
```

Microfone exige **HTTPS** (ou `localhost`). Para testar no celular em desenvolvimento, use um túnel HTTPS (ex.: `cloudflared tunnel --url http://localhost:3000`) ou o deploy na Vercel.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | IA conversacional (`anthropic` ou `openai`). Modelo vazio = padrão do provedor |
| `STT_API_KEY`, `STT_MODEL`, `STT_LANGUAGE`, `STT_BASE_URL` | Transcrição (padrão `whisper-1`, `pt`) |
| `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_SPEED`, `TTS_BASE_URL` | Voz (padrão `tts-1`, `nova`, 1.0) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Públicas por design (protegidas por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Somente servidor.** Nunca com prefixo `NEXT_PUBLIC_` |
| `JARVIS_REQUIRE_AUTH` | `true` exige login Supabase (Bearer token) nas rotas |
| `RATE_LIMIT_PER_MINUTE` | Limite por usuário/IP/rota (em memória; use Redis em produção multi-instância) |

Sem `AI_API_KEY`/`STT_API_KEY` as rotas respondem `503 NOT_CONFIGURED`; sem `TTS_API_KEY` a resposta é falada pela voz do navegador.

## Supabase

1. Crie um projeto e execute `supabase/migrations/0001_init.sql` (SQL Editor ou `supabase db push`).
2. Defina as três variáveis do Supabase.
3. Tabelas: `profiles`, `conversations`, `messages` (roles `user|assistant|system`), com RLS habilitado.

No MVP não há login: o backend grava com service-role e `user_id` nulo. Ao implementar autenticação, torne `conversations.user_id` `NOT NULL`, envie `Authorization: Bearer <access_token>` nas chamadas e ligue `JARVIS_REQUIRE_AUTH=true`.

## PWA

`app/manifest.ts` (nome JARVIS, `display: standalone`, tema escuro), ícones em `public/icons` (regenere com `node scripts/generate-icons.mjs`) e `public/sw.js` (cache só do shell; **nunca** cacheia `/api`). O service worker só é registrado em produção. Para instalar: Android/Chrome → menu → "Instalar app"; iOS/Safari → Compartilhar → "Adicionar à Tela de Início".

## Build e deploy na Vercel

```bash
npm run lint && npm run build && npm start
```

1. Suba o repositório no GitHub e importe em vercel.com (framework Next.js detectado).
2. Em *Settings → Environment Variables*, cadastre as variáveis acima (as secretas **sem** `NEXT_PUBLIC_`).
3. Deploy. A URL é HTTPS, então microfone e instalação PWA funcionam.

## Deploy na Cloudflare (Workers + OpenNext)

O projeto também roda em Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (`wrangler.jsonc`, `open-next.config.ts`).

```bash
cp .dev.vars.example .dev.vars   # chaves para o preview local (não commitado)
npm run preview                  # build do Worker + execução local no runtime da Cloudflare
npx wrangler login
npm run deploy                   # publica o Worker "jarvis"
```

- Cadastre as chaves secretas em *Workers & Pages → jarvis → Settings → Variables and Secrets* (como **Secret**) ou com `npx wrangler secret put AI_API_KEY` etc. As `NEXT_PUBLIC_*` também precisam existir no **build**.
- Deploy por Git: em *Workers & Pages → Create → Import a repository*, use build `npm ci && npx opennextjs-cloudflare build` e deploy `npx wrangler deploy`.
- O cache incremental (R2) não está configurado: o app é praticamente todo dinâmico. Veja [opennext.js.org/cloudflare/caching](https://opennext.js.org/cloudflare/caching) se precisar.
- O rate limit em memória (`lib/security.ts`) vale por isolate; para proteção real use as regras de Rate Limiting da Cloudflare.
- `maxDuration` das rotas é ignorado na Cloudflare; vale o limite do plano de Workers.

## Troubleshooting

- **Microfone não pede permissão / indisponível** — precisa de HTTPS; verifique permissões do site no navegador.
- **`503 NOT_CONFIGURED`** — falta a chave indicada nos logs do servidor.
- **Sem som no iPhone** — o áudio é liberado no toque do microfone; verifique o modo silencioso e o volume.
- **Transcrição vazia** — fale mais perto/por mais tempo; áudios < 1 KB são descartados.
- **Resposta falada com voz robótica** — `TTS_API_KEY` não configurada (fallback do navegador).
- **429** — rate limit; ajuste `RATE_LIMIT_PER_MINUTE`.
