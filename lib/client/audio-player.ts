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

/**
 * Voz do navegador (pt-BR). Perfil desejado: homem de meia-idade, grave.
 * O navegador não tem "rouca": o mais perto disso é baixar o tom (pitch) e a velocidade.
 */
const PITCH = 0.7; // 0 a 2 (1 = normal). Menor = mais grave.
const RATE = 0.92; // 0.1 a 10 (1 = normal). Um pouco mais lento soa mais maduro.

// Nomes de vozes masculinas conhecidas (Microsoft/Google/Apple), em ordem de preferência.
const MALE_NAMES = ["antonio", "antônio", "daniel", "felipe", "donato", "humberto", "ricardo", "luciano", "male", "masculin"];
const FEMALE_NAMES = ["francisca", "maria", "luciana", "fernanda", "thalita", "camila", "female", "feminin", "google português do brasil"];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const pt = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("pt-br"));
  const ptAny = voices.filter((v) => v.lang.toLowerCase().startsWith("pt"));
  const pool = pt.length ? pt : ptAny;
  const has = (v: SpeechSynthesisVoice, names: string[]) => names.some((n) => v.name.toLowerCase().includes(n));
  for (const n of MALE_NAMES) {
    const found = pool.find((v) => v.name.toLowerCase().includes(n));
    if (found) return found;
  }
  return pool.find((v) => !has(v, FEMALE_NAMES)) ?? pool[0];
}

/** Algumas vozes só ficam disponíveis depois do evento "voiceschanged". */
function loadVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 800);
  });
}

/** Fallback: voz do navegador (pt-BR) quando o TTS do servidor não está disponível. */
export async function speakWithBrowser(text: string, onStart?: () => void): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth) throw new Error("unsupported");
  const voices = await loadVoices(synth);
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    const voice = pickVoice(voices);
    if (voice) utter.voice = voice;
    utter.pitch = PITCH;
    utter.rate = RATE;
    utter.onstart = () => onStart?.();
    utter.onend = () => resolve();
    utter.onerror = () => resolve(); // cancelamento também dispara erro
    synth.speak(utter);
  });
}
