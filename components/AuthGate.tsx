"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";
import { configureBrowserClient, getBrowserClient } from "@/lib/supabase/browser";
import { JarvisApp } from "./JarvisApp";

type Mode = "signin" | "signup";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/50";

function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered")) return "Este e-mail já tem cadastro. Entre com a senha.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um pouco.";
  return "Não foi possível concluir. Tente novamente.";
}

function LoginForm() {
  const supabase = getBrowserClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const creds = { email: email.trim(), password };
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword(creds);
      if (err) setError(translate(err.message));
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        ...creds,
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) setError(translate(err.message));
      else if (!data.session) setInfo("Cadastro criado. Confirme seu e-mail para entrar.");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-center text-sm font-semibold tracking-[0.5em] text-cyan-200">JARVIS</h1>
      {!supabase ? (
        <p role="alert" className="text-center text-sm text-amber-300">
          Login indisponível: o Supabase não está configurado neste ambiente.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            aria-label="E-mail"
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            aria-label="Senha"
            className={inputClass}
          />
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          {info && <p className="text-sm text-cyan-200">{info}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl border border-cyan-300/40 px-4 py-3 text-sm text-cyan-100 disabled:opacity-40"
          >
            {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="text-xs text-slate-400 hover:text-cyan-200"
          >
            {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </form>
      )}
    </main>
  );
}

/** Só renderiza o JARVIS com uma sessão Supabase válida; senão mostra o login. */
export function AuthGate({ supabase: cfg }: { supabase: { url: string; anonKey: string } }) {
  configureBrowserClient(cfg.url, cfg.anonKey);
  const [session, setSession] = useState<Session | null>(null);
  // Sem Supabase configurado não há sessão para carregar.
  const [ready, setReady] = useState(() => !getBrowserClient());

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <main className="h-dvh" aria-busy="true" />;
  if (!session) return <LoginForm />;
  return (
    <JarvisApp
      key={session.user.id}
      email={session.user.email}
      onSignOut={() => void getBrowserClient()?.auth.signOut()}
    />
  );
}
