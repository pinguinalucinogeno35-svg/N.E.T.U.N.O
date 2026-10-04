export type RecorderErrorCode = "UNSUPPORTED" | "DENIED" | "NO_DEVICE" | "EMPTY" | "FAILED";

export class RecorderError extends Error {
  constructor(public code: RecorderErrorCode) {
    super(code);
  }
}

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export const isRecordingSupported = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  typeof MediaRecorder !== "undefined";

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Uint8Array<ArrayBuffer> | null = null;

  async start(): Promise<void> {
    if (!isRecordingSupported()) throw new RecorderError("UNSUPPORTED");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") throw new RecorderError("DENIED");
      if (name === "NotFoundError" || name === "OverconstrainedError") throw new RecorderError("NO_DEVICE");
      throw new RecorderError("FAILED");
    }
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
    try {
      this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    } catch {
      this.release();
      throw new RecorderError("UNSUPPORTED");
    }
    this.chunks = [];
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start();
    this.setupAnalyser();
  }

  /** Volume atual (0..1) para animar o núcleo. */
  level(): number {
    if (!this.analyser || !this.buf) return 0;
    this.analyser.getByteTimeDomainData(this.buf);
    let peak = 0;
    for (const v of this.buf) peak = Math.max(peak, Math.abs(v - 128));
    return Math.min(1, peak / 64);
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const rec = this.recorder;
      if (!rec || rec.state === "inactive") {
        this.release();
        return reject(new RecorderError("FAILED"));
      }
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: rec.mimeType || "audio/webm" });
        this.release();
        if (blob.size < 1000) reject(new RecorderError("EMPTY"));
        else resolve(blob);
      };
      rec.stop();
    });
  }

  cancel() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.release();
  }

  private setupAnalyser() {
    try {
      this.ctx = new AudioContext();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.ctx.createMediaStreamSource(this.stream!).connect(this.analyser);
      this.buf = new Uint8Array(this.analyser.fftSize);
    } catch {
      this.analyser = null; // animação por volume é opcional
    }
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => undefined);
    this.stream = this.recorder = this.ctx = this.analyser = this.buf = null;
  }
}
