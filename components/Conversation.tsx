"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types";

export function Conversation({ messages }: { messages: ChatMessage[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Toque no microfone e fale em português, ou digite abaixo.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3 py-2" aria-label="Histórico da conversa">
      {messages.map((m) => (
        <li
          key={m.id}
          className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
            m.role === "user"
              ? "self-end rounded-br-sm bg-cyan-500/15 text-cyan-50"
              : "self-start rounded-bl-sm border border-white/10 bg-white/5 text-slate-100"
          }`}
        >
          <span className="mb-0.5 block text-[10px] tracking-widest text-slate-400">
            {m.role === "user" ? "VOCÊ" : "JARVIS"}
          </span>
          {m.content}
        </li>
      ))}
      <div ref={end} />
    </ul>
  );
}
