"use client";

import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { Conversation } from "./Conversation";
import { JarvisOrb } from "./JarvisOrb";
import { StatusIndicator } from "./StatusIndicator";
import { TextComposer } from "./TextComposer";
import { VoiceButton } from "./VoiceButton";

export function JarvisApp() {
  const v = useVoiceAssistant();
  const busy = v.state === "processing" || v.state === "listening";

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-[0.5em] text-cyan-200">JARVIS</h1>
        <button
          type="button"
          onClick={v.newConversation}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-cyan-300/40"
        >
          Nova conversa
        </button>
      </header>

      <section className="flex flex-col items-center gap-4 pt-4">
        <JarvisOrb state={v.state} getLevel={v.getLevel} />
        <StatusIndicator state={v.state} error={v.error} />
        <div className="flex items-start gap-6">
          <VoiceButton state={v.state} disabled={!v.supported} onClick={v.toggleMic} />
          {v.state === "speaking" && (
            <button
              type="button"
              onClick={v.interrupt}
              className="mt-5 rounded-full border border-amber-300/50 px-4 py-2 text-xs text-amber-200"
            >
              Interromper
            </button>
          )}
        </div>
        {!v.supported && (
          <p className="text-center text-xs text-amber-300">
            Gravação de voz indisponível neste navegador (ou fora de HTTPS). Use o campo de texto.
          </p>
        )}
      </section>

      <section className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <Conversation messages={v.messages} />
      </section>

      <footer className="pt-2">
        <TextComposer disabled={busy} onSubmit={v.submitText} />
      </footer>
    </main>
  );
}
