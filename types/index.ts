export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Exclude<Role, "system">;
  content: string;
  createdAt: number;
}

/** Estados da máquina de voz exibidos na interface. */
export type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

export interface HistoryItem {
  role: Role;
  content: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
