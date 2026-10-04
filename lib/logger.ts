import "server-only";

/**
 * Logger mínimo. Nunca registre chaves, tokens, áudio ou conteúdo de conversas:
 * apenas códigos, rotas e durações.
 */
type Meta = Record<string, string | number | boolean | undefined>;

function emit(level: "info" | "warn" | "error", event: string, meta?: Meta) {
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, meta?: Meta) => emit("info", event, meta),
  warn: (event: string, meta?: Meta) => emit("warn", event, meta),
  error: (event: string, meta?: Meta) => emit("error", event, meta),
};
