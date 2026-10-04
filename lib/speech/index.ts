import "server-only";
import { config } from "@/lib/config";
import { AppError } from "@/lib/errors";
import type { SpeechInput, SttProvider, TranscribeInput, TtsProvider, TtsResult } from "./types";

/** STT via endpoint compatível com OpenAI (/audio/transcriptions). */
const openaiStt: SttProvider = {
  name: "openai",
  async transcribe({ audio, filename, language }: TranscribeInput) {
    const form = new FormData();
    form.append("file", audio, filename);
    form.append("model", config.stt.model);
    form.append("language", language);
    form.append("response_format", "json");
    const res = await fetch(`${config.stt.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.stt.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(config.stt.timeoutMs),
    });
    if (!res.ok) {
      throw new AppError("STT_FAILED", `status ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as { text?: string };
    return (data.text ?? "").trim();
  },
};

/** TTS via endpoint compatível com OpenAI (/audio/speech). */
const openaiTts: TtsProvider = {
  name: "openai",
  async synthesize({ text, voice, speed, model }: SpeechInput): Promise<TtsResult> {
    const res = await fetch(`${config.tts.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.tts.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model ?? config.tts.model,
        voice: voice ?? config.tts.voice,
        speed: speed ?? config.tts.speed,
        input: text,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(config.tts.timeoutMs),
    });
    if (!res.ok) {
      throw new AppError("TTS_FAILED", `status ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return { audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
  },
};

export function getSttProvider(): SttProvider {
  if (!config.stt.apiKey) throw new AppError("NOT_CONFIGURED", "STT_API_KEY ausente");
  return openaiStt; // ponto de troca: escolher por config.stt.provider
}

export function getTtsProvider(): TtsProvider {
  if (!config.tts.apiKey) throw new AppError("NOT_CONFIGURED", "TTS_API_KEY ausente");
  return openaiTts; // ponto de troca: escolher por config.tts.provider
}
