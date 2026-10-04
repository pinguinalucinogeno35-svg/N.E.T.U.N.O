"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, chat, synthesize, transcribe } from "@/lib/client/api";
import { AudioPlayer, speakWithBrowser } from "@/lib/client/audio-player";
import { isRecordingSupported, RecorderError, VoiceRecorder } from "@/lib/client/recorder";
import type { ChatMessage, VoiceState } from "@/types";

const RECORDER_MESSAGES: Record<string, string> = {
  UNSUPPORTED: "Seu navegador não suporta gravação de áudio. Use o campo de texto ou outro navegador.",
  DENIED: "Permissão do microfone negada. Libere o microfone nas configurações do navegador.",
  NO_DEVICE: "Nenhum microfone disponível neste dispositivo.",
  EMPTY: "Não ouvi nada. Toque no microfone e tente falar novamente.",
  FAILED: "Não consegui usar o microfone. Tente novamente.",
};

const uid = () => crypto.randomUUID();
const subscribeNoop = () => () => undefined;

/**
 * Orquestra o fluxo: microfone → STT → IA → TTS → áudio.
 * Toda a lógica de voz fica aqui; os componentes só renderizam estado.
 * Para migrar a tempo real (streaming), troque as etapas internas mantendo
 * esta mesma interface pública.
 */
export function useVoiceAssistant() {
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supported = useSyncExternalStore(subscribeNoop, isRecordingSupported, () => true);

  const recorder = useRef<VoiceRecorder | null>(null);
  const player = useRef<AudioPlayer | null>(null);
  const conversationId = useRef<string | undefined>(undefined);
  const messagesRef = useRef<ChatMessage[]>([]);
  const runId = useRef(0); // invalida execuções antigas ao interromper/reiniciar

  useEffect(() => {
    player.current = new AudioPlayer();
    const rec = recorder;
    const play = player;
    return () => {
      rec.current?.cancel();
      play.current?.stop();
    };
  }, []);

  const addMessage = useCallback((role: ChatMessage["role"], content: string) => {
    const msg: ChatMessage = { id: uid(), role, content, createdAt: Date.now() };
    messagesRef.current = [...messagesRef.current, msg];
    setMessages(messagesRef.current);
  }, []);

  const fail = useCallback((message: string) => {
    setError(message);
    setState("error");
  }, []);

  const speak = useCallback(async (text: string, id: number) => {
    setState("speaking");
    try {
      const blob = await synthesize(text);
      if (id !== runId.current) return;
      await player.current!.play(blob);
    } catch (e) {
      if (id !== runId.current) return;
      // TTS do servidor indisponível/não configurado → voz do navegador.
      try {
        await speakWithBrowser(text);
      } catch {
        if (e instanceof ApiError && e.code === "NETWORK") throw e;
      }
    }
  }, []);

  /** Envia texto à IA e fala a resposta (usado pela voz e pelo campo de texto). */
  const sendText = useCallback(
    async (text: string, id: number) => {
      addMessage("user", text);
      setState("processing");
      const history = messagesRef.current
        .slice(0, -1)
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await chat({ message: text, conversationId: conversationId.current, history });
      if (id !== runId.current) return;
      conversationId.current = res.conversationId;
      addMessage("assistant", res.reply);
      await speak(res.reply, id);
      if (id === runId.current) setState("idle");
    },
    [addMessage, speak],
  );

  const handleError = useCallback(
    (e: unknown, id: number) => {
      if (id !== runId.current) return;
      if (e instanceof RecorderError) return fail(RECORDER_MESSAGES[e.code]);
      if (e instanceof ApiError) return fail(e.message);
      fail("Algo deu errado. Tente novamente.");
    },
    [fail],
  );

  const startListening = useCallback(async () => {
    setError(null);
    player.current?.unlock();
    player.current?.stop();
    const id = ++runId.current;
    try {
      recorder.current = new VoiceRecorder();
      await recorder.current.start();
      if (id === runId.current) setState("listening");
    } catch (e) {
      handleError(e, id);
    }
  }, [handleError]);

  const stopListening = useCallback(async () => {
    const id = runId.current;
    setState("processing");
    try {
      const blob = await recorder.current!.stop();
      const text = await transcribe(blob);
      if (id !== runId.current) return;
      if (!text) return fail("Não entendi o que você disse. Tente novamente.");
      await sendText(text, id);
    } catch (e) {
      handleError(e, id);
    }
  }, [fail, handleError, sendText]);

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setError(null);
      player.current?.unlock();
      player.current?.stop();
      const id = ++runId.current;
      try {
        await sendText(trimmed, id);
      } catch (e) {
        handleError(e, id);
      }
    },
    [handleError, sendText],
  );

  const toggleMic = useCallback(() => {
    if (state === "listening") void stopListening();
    else if (state === "idle" || state === "error" || state === "speaking") void startListening();
  }, [state, startListening, stopListening]);

  const interrupt = useCallback(() => {
    runId.current += 1;
    recorder.current?.cancel();
    player.current?.stop();
    setState("idle");
  }, []);

  const newConversation = useCallback(() => {
    interrupt();
    messagesRef.current = [];
    setMessages([]);
    conversationId.current = undefined;
    setError(null);
  }, [interrupt]);

  const getLevel = useCallback(() => recorder.current?.level() ?? 0, []);

  return {
    state, messages, error, supported,
    toggleMic, interrupt, newConversation, submitText, getLevel,
  };
}
