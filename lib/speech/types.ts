export interface TranscribeInput {
  audio: Blob;
  filename: string;
  language: string;
}

export interface SttProvider {
  readonly name: string;
  transcribe(input: TranscribeInput): Promise<string>;
}

export interface SpeechInput {
  text: string;
  voice?: string;
  speed?: number;
  model?: string;
}

export interface TtsResult {
  audio: ArrayBuffer;
  contentType: string;
}

export interface TtsProvider {
  readonly name: string;
  synthesize(input: SpeechInput): Promise<TtsResult>;
}
