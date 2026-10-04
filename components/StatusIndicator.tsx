import type { VoiceState } from "@/types";

const LABEL: Record<VoiceState, { short: string; long: string }> = {
  idle: { short: "PRONTO", long: "Pronto" },
  listening: { short: "OUVINDO", long: "Ouvindo..." },
  processing: { short: "PROCESSANDO", long: "Processando..." },
  speaking: { short: "RESPONDENDO", long: "Respondendo..." },
  error: { short: "ERRO", long: "Algo deu errado" },
};

export function StatusIndicator({ state, error }: { state: VoiceState; error: string | null }) {
  return (
    <div className="text-center" role="status" aria-live="polite">
      <p className="text-xs tracking-[0.35em] text-cyan-300/70">{LABEL[state].short}</p>
      <p className={`mt-1 text-lg ${state === "error" ? "text-rose-300" : "text-slate-100"}`}>
        {state === "error" && error ? error : LABEL[state].long}
      </p>
    </div>
  );
}
