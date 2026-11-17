import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { AppError, errorResponse } from "@/lib/errors";
import { searchMemories } from "@/lib/memory";
import { guard } from "@/lib/security";

export const runtime = "nodejs";

const bodySchema = z.object({
  query: z.string().trim().min(1).max(config.limits.maxMessageChars),
  limit: z.number().int().min(1).max(20).optional(),
});

/** Busca semântica nas memórias do usuário. */
export async function POST(req: NextRequest) {
  try {
    const user = await guard(req);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("BAD_REQUEST", parsed.error.message);
    const memories = await searchMemories({ userId: user.id, ...parsed.data });
    return NextResponse.json({ memories });
  } catch (err) {
    return errorResponse(err, "memory_search");
  }
}
