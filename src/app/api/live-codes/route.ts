import { kv } from "@vercel/kv";
import { put, del } from "@vercel/blob";
import QRCode from "qrcode";
import { NextResponse } from "next/server";

// ==================== Database Helpers ====================

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

async function getLiveCodes(): Promise<LiveCode[]> {
  const codes = await kv.lrange("live_codes", 0, -1);
  return codes.map((c) => JSON.parse(c));
}

async function getLiveCode(id: string): Promise<LiveCode | null> {
  const code = await kv.get<LiveCode>(`live_code:${id}`);
  return code;
}

async function saveLiveCode(code: LiveCode): Promise<void> {
  const exists = await kv.exists(`live_code:${code.id}`);
  if (!exists) {
    await kv.lpush("live_codes", JSON.stringify(code));
  }
  await kv.set(`live_code:${code.id}`, code);
}

async function deleteLiveCode(id: string): Promise<void> {
  const targets = await getTargets(id);
  for (const target of targets) {
    if (target.image) {
      try {
        await del(target.image);
      } catch (e) {
        console.error("Failed to delete blob:", e);
      }
    }
  }
  await kv.del(`live_code:${id}`);
  // Remove from list
  const allCodes = await getLiveCodes();
  const filtered = allCodes.filter((c) => c.id !== id);
  await kv.del("live_codes");
  for (const c of filtered) {
    await kv.lpush("live_codes", JSON.stringify(c));
  }
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

// ==================== Admin Auth ====================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function verifyAdmin.authorization(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

// ==================== API Routes ====================

export async function GET() {
  try {
    const codes = await getLiveCodes();
    const result = await Promise.all(
      codes.map(async (code) => {
        const targets = await getTargets(code.id);
        const activeTarget = targets.find((t) => t.is_active === 1) || targets[0];
        return {
          ...code,
          targets,
          activeIndex: targets.indexOf(activeTarget),
        };
      })
    );
    return NextResponse.json({ codes: result });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch codes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdmin.authorization(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, type } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    const id = crypto.randomUUID().slice(0, 8);
    const code: LiveCode = {
      id,
      name,
      description: description || "",
      type,
      created_at: new Date().toISOString(),
    };

    await saveLiveCode(code);
    return NextResponse.json({ success: true, code });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create code" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin.authorization(request)) {
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

    await saveLiveCode(code);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update code" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin.authorization(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteLiveCode(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete code" }, { status: 500 });
  }
}
