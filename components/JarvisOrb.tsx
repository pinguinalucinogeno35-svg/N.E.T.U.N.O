"use client";

import { useEffect, useRef } from "react";
import type { VoiceState } from "@/types";

interface Props {
  state: VoiceState;
  getLevel: () => number;
}

/** Núcleo animado. As animações são CSS (barato); só o volume do mic usa rAF. */
export function JarvisOrb({ state, getLevel }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || state !== "listening") {
      ref.current?.style.setProperty("--level", "0");
      return;
    }
    let raf = 0;
    const tick = () => {
      el.style.setProperty("--level", getLevel().toFixed(2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, getLevel]);

  return (
    <div ref={ref} className="orb" data-state={state} aria-hidden="true">
      <span className="orb-ring orb-ring-1" />
      <span className="orb-ring orb-ring-2" />
      <span className="orb-ring orb-ring-3" />
      <span className="orb-core" />
    </div>
  );
}
