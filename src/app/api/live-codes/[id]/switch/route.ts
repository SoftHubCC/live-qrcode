import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function verifyAdmin(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { targetId } = body;

    if (!targetId) {
      return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    }

    // Get all targets
    const targetsRaw = await kv.lrange(`targets:${id}`, 0, -1);
    const targets = targetsRaw.map((t) => JSON.parse(t));

    // Set active
    for (const target of targets) {
      target.is_active = target.id === targetId ? 1 : 0;
    }

    // Save back
    await kv.del(`targets:${id}`);
    for (const target of targets) {
      await kv.lpush(`targets:${id}`, JSON.stringify(target));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to switch target" }, { status: 500 });
  }
}
