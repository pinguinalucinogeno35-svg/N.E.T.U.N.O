"use client";

import { useState } from "react";

export function TextComposer({ disabled, onSubmit }: { disabled: boolean; onSubmit: (t: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSubmit(value);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={2000}
        placeholder="Ou escreva uma mensagem..."
        aria-label="Mensagem de texto"
        className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-full border border-cyan-300/40 px-4 py-2 text-sm text-cyan-100 disabled:opacity-40"
      >
        Enviar
      </button>
    </form>
  );
}
