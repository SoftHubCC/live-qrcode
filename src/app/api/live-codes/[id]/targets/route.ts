import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

interface Target {
  id: string;
  live_code_id: string;
  type: "qr" | "link" | "file";
  value: string;
  image?: string;
  label: string;
  note: string;
  is_active: number;
  created_at: string;
}

async function getTargets(codeId: string): Promise<Target[]> {
  const targets = await kv.lrange(`targets:${codeId}`, 0, -1);
  return targets.map((t) => JSON.parse(t));
}

async function saveTarget(target: Target): Promise<void> {
  await kv.lpush(`targets:${target.live_code_id}`, JSON.stringify(target));
}

async function deleteTarget(codeId: string, targetId: string): Promise<void> {
  const targets = await getTargets(codeId);
  const filtered = targets.filter((t) => t.id !== targetId);
  await kv.del(`targets:${codeId}`);
  for (const t of filtered) {
    await kv.lpush(`targets:${codeId}`, JSON.stringify(t));
  }
}

async function setTargetActive(codeId: string, targetId: string): Promise<void> {
  const targets = await getTargets(codeId);
  for (const t of targets) {
    t.is_active = t.id === targetId ? 1 : 0;
  }
  await kv.del(`targets:${codeId}`);
  for (const t of targets) {
    await kv.lpush(`targets:${codeId}`, JSON.stringify(t));
  }
}

async function updateTarget(codeId: string, targetId: string, updates: Partial<Target>): Promise<void> {
  const targets = await getTargets(codeId);
  const target = targets.find((t) => t.id === targetId);
  if (target) {
    Object.assign(target, updates);
    await kv.del(`targets:${codeId}`);
    for (const t of targets) {
      await kv.lpush(`targets:${codeId}`, JSON.stringify(t));
    }
  }
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function verifyAdmin(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

// GET all targets for a code
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const targets = await getTargets(id);
    return NextResponse.json({ targets });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch targets" }, { status: 500 });
  }
}

// POST - add new target
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
    const { type, value, label, note, image } = body;

    if (!type || !value) {
      return NextResponse.json({ error: "Type and value are required" }, { status: 400 });
    }

    const target: Target = {
      id: crypto.randomUUID().slice(0, 8),
      live_code_id: id,
      type,
      value,
      label: label || "",
      note: note || "",
      image: image || undefined,
      is_active: 0,
      created_at: new Date().toISOString(),
    };

    await saveTarget(target);
    return NextResponse.json({ success: true, target });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create target" }, { status: 500 });
  }
}

// PUT - update target
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; targetId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, targetId } = await params;
    const body = await request.json();
    await updateTarget(id, targetId, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update target" }, { status: 500 });
  }
}

// DELETE target
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; targetId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, targetId } = await params;
    await deleteTarget(id, targetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete target" }, { status: 500 });
  }
}
