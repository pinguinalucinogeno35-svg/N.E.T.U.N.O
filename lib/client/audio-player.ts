/**
 * Player de resposta. Safari/iOS só permite tocar áudio assíncrono em um
 * elemento "desbloqueado" por um gesto do usuário; por isso `unlock()` é chamado
 * no toque do microfone e o mesmo <audio> é reutilizado.
 */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export class AudioPlayer {
  private el: HTMLAudioElement | null = null;
  private url: string | null = null;
  private onDone: (() => void) | null = null;

  private ensure() {
    this.el ??= new Audio();
    return this.el;
  }

  unlock() {
    const el = this.ensure();
    if (el.src) return;
    el.src = SILENT_WAV;
    el.play().catch(() => undefined);
  }

  play(blob: Blob): Promise<void> {
    this.stop();
    const el = this.ensure();
    this.url = URL.createObjectURL(blob);
    el.src = this.url;
    return new Promise<void>((resolve, reject) => {
      this.onDone = resolve;
      el.onended = () => this.finish();
      el.onerror = () => {
        this.onDone = null;
        this.cleanup();
        reject(new Error("playback"));
      };
      el.play().catch((e) => {
        this.onDone = null;
        this.cleanup();
        reject(e);
      });
    });
  }

  stop() {
    this.el?.pause();
    window.speechSynthesis?.cancel();
    this.finish();
  }

  private finish() {
    const done = this.onDone;
    this.onDone = null;
    this.cleanup();
    done?.();
  }

  private cleanup() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}

/** Fallback: voz do navegador (pt-BR) quando o TTS do servidor não está disponível. */
export function speakWithBrowser(text: string, onStart?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    if (!synth) return reject(new Error("unsupported"));
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt-br"));
    if (voice) utter.voice = voice;
    utter.onstart = () => onStart?.();
    utter.onend = () => resolve();
    utter.onerror = () => resolve(); // cancelamento também dispara erro
    synth.speak(utter);
  });
}
