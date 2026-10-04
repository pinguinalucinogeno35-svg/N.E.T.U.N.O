/**
 * Contrato comum de ferramentas do JARVIS (ainda não executadas no MVP).
 *
 * - READ: consulta informações.
 * - WRITE: cria/altera informações.
 * - DESTRUCTIVE: exclui, cancela ou executa ação irreversível.
 *
 * WRITE e DESTRUCTIVE devem exigir confirmação explícita do usuário antes de
 * `execute`, e sempre rodar no servidor com as permissões do usuário.
 */
export type ToolRisk = "READ" | "WRITE" | "DESTRUCTIVE";

export interface ToolContext {
  userId: string;
  /** Escopos concedidos ao usuário (ex.: "calendar:read"). */
  grantedScopes: string[];
}

export interface Tool<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  risk: ToolRisk;
  /** Escopo exigido para executar (ex.: "crm:read"). */
  scope: string;
  /** JSON Schema dos parâmetros, para function-calling do modelo. */
  inputSchema: Record<string, unknown>;
  /** Valida e normaliza o input vindo do modelo (nunca confie nele). */
  parse(raw: unknown): Input;
  execute(input: Input, ctx: ToolContext): Promise<Output>;
}

export interface PendingConfirmation {
  toolName: string;
  summary: string;
  input: unknown;
}

export const requiresConfirmation = (risk: ToolRisk) => risk !== "READ";
