import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente do navegador: usa APENAS a anon key (pública por design), protegida
 * por RLS. Ainda não é usado no MVP; está pronto para a camada de autenticação.
 */
let client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}
