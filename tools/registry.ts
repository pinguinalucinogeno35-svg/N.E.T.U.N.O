import { requiresConfirmation, type Tool, type ToolContext } from "./types";

const tools = new Map<string, Tool>();

export function registerTool(tool: Tool) {
  tools.set(tool.name, tool);
}

export const listTools = () => [...tools.values()];

export type ToolRunResult =
  | { status: "executed"; output: unknown }
  | { status: "needs_confirmation"; toolName: string; input: unknown }
  | { status: "denied"; reason: string };

/** Executor central: checa permissão e confirmação antes de qualquer execução. */
export async function runTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
  confirmed = false,
): Promise<ToolRunResult> {
  const tool = tools.get(name);
  if (!tool) return { status: "denied", reason: "ferramenta desconhecida" };
  if (!ctx.grantedScopes.includes(tool.scope)) return { status: "denied", reason: "sem permissão" };
  const input = tool.parse(rawInput);
  if (requiresConfirmation(tool.risk) && !confirmed) {
    return { status: "needs_confirmation", toolName: name, input };
  }
  return { status: "executed", output: await tool.execute(input, ctx) };
}
