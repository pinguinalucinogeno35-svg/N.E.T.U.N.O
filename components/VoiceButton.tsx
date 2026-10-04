import type { VoiceState } from "@/types";

interface Props {
  state: VoiceState;
  disabled?: boolean;
  onClick: () => void;
}

const LABEL: Record<VoiceState, string> = {
  idle: "Toque para falar",
  listening: "Toque para enviar",
  processing: "Processando",
  speaking: "Toque para falar",
  error: "Tentar novamente",
};

export function VoiceButton({ state, disabled, onClick }: Props) {
  const listening = state === "listening";
  const busy = state === "processing";
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-pressed={listening}
        aria-label={listening ? "Parar gravação e enviar" : "Começar a falar"}
        className={`grid h-20 w-20 place-items-center rounded-full border transition active:scale-95 disabled:opacity-40 ${
          listening
            ? "border-rose-300/70 bg-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.45)]"
            : "border-cyan-300/60 bg-cyan-400/10 shadow-[0_0_32px_rgba(34,211,238,0.35)] hover:bg-cyan-400/20"
        }`}
      >
        {listening ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-rose-200">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-cyan-200">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        )}
      </button>
      <span className="text-xs text-slate-400">{LABEL[state]}</span>
    </div>
  );
}
