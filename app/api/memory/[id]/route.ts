import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { deleteMemory } from "@/lib/memory";
import { guard } from "@/lib/security";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await guard(req);
    const id = z.uuid().safeParse((await params).id);
    if (!id.success) throw new AppError("BAD_REQUEST", "id inválido");
    const removed = await deleteMemory(user.id, id.data);
    return NextResponse.json({ removed }, { status: removed ? 200 : 404 });
  } catch (err) {
    return errorResponse(err, "memory_delete");
  }
}
