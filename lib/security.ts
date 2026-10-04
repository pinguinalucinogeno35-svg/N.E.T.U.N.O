import "server-only";
import type { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { getUserFromToken } from "@/lib/supabase/server";

export interface RequestUser {
  id: string | null;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Rate limit simples em memória (por instância). Em produção, use Redis/Upstash. */
function rateLimit(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > config.limits.rateLimitPerMinute) throw new AppError("RATE_LIMITED", key);
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }
}

/**
 * Ponto único de proteção das rotas: identifica o usuário (Bearer token do
 * Supabase Auth), aplica rate limit e exige login se JARVIS_REQUIRE_AUTH=true.
 */
export async function guard(req: NextRequest): Promise<RequestUser> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const userId = token ? await getUserFromToken(token) : null;

  if (config.requireAuth && !userId) throw new AppError("UNAUTHORIZED");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  rateLimit(`${userId ?? ip}:${req.nextUrl.pathname}`);
  return { id: userId };
}
