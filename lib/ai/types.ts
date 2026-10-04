export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiRequest {
  system: string;
  messages: AiMessage[];
}

/** Contrato que qualquer provedor de IA conversacional precisa cumprir. */
export interface AiProvider {
  readonly name: string;
  generate(req: AiRequest): Promise<string>;
}
