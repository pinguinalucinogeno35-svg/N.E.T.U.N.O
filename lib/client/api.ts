import { getBrowserClient } from "@/lib/supabase/browser";
import type { ApiErrorBody, HistoryItem } from "@/types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Adiciona o token da sessão Supabase (Bearer) às chamadas de /api. */
async function withAuth(init: RequestInit): Promise<RequestInit> {
  const supabase = getBrowserClient();
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return { ...init, headers };
}

async function request(path: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, await withAuth(init));
  } catch {
    throw new ApiError("NETWORK", "Sem conexão com o servidor. Verifique sua internet.");
  }
  if (res.status === 401) {
    // Sessão expirada/inválida: volta para a tela de login.
    await getBrowserClient()?.auth.signOut();
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
