import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { AppError, errorResponse } from "@/lib/errors";
import { saveMemory } from "@/lib/memory";
import { guard } from "@/lib/security";

export const runtime = "nodejs";

const bodySchema = z.object({
  content: z.string().trim().min(1).max(config.limits.maxMemoryChars),
  kind: z.enum(["fact", "preference", "document"]).optional(),
  source: z.string().trim().max(200).optional(),
});

/** Grava uma memória nova (com embedding). */
export async function POST(req: NextRequest) {
  try {
    const user = await guard(req);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("BAD_REQUEST", parsed.error.message);
    const id = await saveMemory({ userId: user.id, ...parsed.data });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "memory");
  }
}
