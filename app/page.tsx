import { AuthGate } from "@/components/AuthGate";

// Dinâmica: lê as variáveis em tempo de requisição, então funcionam tanto como
// "Build variable" quanto como "Variable/Secret" de runtime na Cloudflare.
export const dynamic = "force-dynamic";

export default function Page() {
  // A anon key é pública por design (protegida por RLS).
  const supabase = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
  return <AuthGate supabase={supabase} />;
}
