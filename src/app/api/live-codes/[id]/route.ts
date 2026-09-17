import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

interface LiveCode {
  id: string;
  name: string;
  description: string;
  type: "qr" | "link" | "file";
  created_at: string;
}

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

async function getLiveCode(id: string): Promise<LiveCode | null> {
  const code = await kv.get<LiveCode>(`live_code:${id}`);
  return code;
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

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function verifyAdmin(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

// GET single code with targets
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const code = await getLiveCode(id);
    if (!code) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }
    const targets = await getTargets(id);
    const activeTarget = targets.find((t) => t.is_active === 1) || targets[0];
    return NextResponse.json({
      ...code,
      targets,
      activeIndex: targets.indexOf(activeTarget),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch code" }, { status: 500 });
  }
}

// UPDATE code
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const code = await getLiveCode(id);

    if (!code) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    if (body.name) code.name = body.name;
    if (body.description !== undefined) code.description = body.description;

    await kv.set(`live_code:${id}`, code);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update code" }, { status: 500 });
  }
}

// DELETE code
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const targets = await getTargets(id);
    // Clean up blobs
    for (const target of targets) {
      if (target.image) {
        try {
          const url = new URL(target.image);
          const filename = url.pathname.split("/").pop();
          if (filename) {
            // Blob deletion would go here if we had the handle
          }
        } catch (e) {}
      }
    }
    await kv.del(`live_code:${id}`);
    await kv.del(`targets:${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete code" }, { status: 500 });
  }
}
