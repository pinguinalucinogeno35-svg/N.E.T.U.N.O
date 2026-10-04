import type { ApiErrorBody, HistoryItem } from "@/types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request(path: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("NETWORK", "Sem conexão com o servidor. Verifique sua internet.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.error.code ?? "INTERNAL", body?.error.message ?? "Algo deu errado.");
  }
  return res;
}

export async function transcribe(audio: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", audio, "audio");
  const res = await request("/api/transcribe", { method: "POST", body: form });
  return ((await res.json()) as { text: string }).text;
}

export async function chat(params: {
  message: string;
  conversationId?: string;
  history: HistoryItem[];
}): Promise<{ reply: string; conversationId?: string }> {
  const res = await request("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function synthesize(text: string): Promise<Blob> {
  const res = await request("/api/speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.blob();
}
