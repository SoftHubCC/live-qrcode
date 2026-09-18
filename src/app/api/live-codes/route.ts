import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import {
  listLiveCodes,
  listTargets,
  createLiveCode,
  findLiveCodeByName,
} from "@/lib/db";
import type { LiveCode, TargetType } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: TargetType[] = ["qr", "link", "file"];

/** GET /api/live-codes —— 列出所有活码（含目标列表） */
export async function GET() {
  try {
    const codes = await listLiveCodes();
    const result = await Promise.all(
      codes.map(async (code) => {
        const targets = await listTargets(code.id);
        const active = targets.find((t) => t.is_active === 1) || targets[0];
        return {
          ...code,
          targets,
          activeIndex: active ? targets.indexOf(active) : -1,
        };
      })
    );
    return NextResponse.json({ codes: result });
  } catch (error) {
    console.error("GET /api/live-codes failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch codes" },
      { status: 500 }
    );
  }
}

/** POST /api/live-codes —— 创建活码 */
export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const type = body.type as TargetType;

    if (!name || !type) {
      return NextResponse.json(
        { error: "名称和类型为必填项" },
        { status: 400 }
      );
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "类型不合法" }, { status: 400 });
    }

    const duplicated = await findLiveCodeByName(name);
    if (duplicated) {
      return NextResponse.json(
        { error: "已存在同名活码，请换一个名称" },
        { status: 409 }
      );
    }

    const code: LiveCode = {
      id: crypto.randomUUID().slice(0, 8),
      name,
      description,
      type,
      created_at: new Date().toISOString(),
    };

    await createLiveCode(code);
    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error("POST /api/live-codes failed:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
