import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { getLiveCode, listTargets, addTarget } from "@/lib/db";
import type { Target } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/** 自动补全协议头，避免用户输入 www.xxx.com 后打不开 */
function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** GET /api/live-codes/:id/targets —— 目标列表 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const targets = await listTargets(params.id);
    return NextResponse.json({ targets });
  } catch (error) {
    console.error("GET targets failed:", error);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}

/** POST /api/live-codes/:id/targets —— 新增目标 */
export async function POST(request: Request, { params }: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const code = await getLiveCode(params.id);
    if (!code) {
      return NextResponse.json({ error: "活码不存在" }, { status: 404 });
    }

    const body = await request.json();
    const label = String(body.label || "").trim();
    const note = String(body.note || "").trim();
    const image = body.image ? String(body.image) : undefined;
    let value = String(body.value || "").trim();

    if (!value && !image) {
      return NextResponse.json(
        { error: "目标和内容不能同时为空" },
        { status: 400 }
      );
    }

    // 链接类型自动补全协议头
    if (code.type === "link" && value && !image) {
      value = normalizeUrl(value);
    }

    const target: Target = {
      id: crypto.randomUUID().slice(0, 8),
      live_code_id: code.id,
      type: code.type,
      value,
      image,
      label,
      note,
      // 如果是第一个目标，直接设为活跃
      is_active: (await listTargets(code.id)).length === 0 ? 1 : 0,
      created_at: new Date().toISOString(),
    };

    await addTarget(target);
    return NextResponse.json({ success: true, target });
  } catch (error) {
    console.error("POST targets failed:", error);
    return NextResponse.json({ error: "添加失败" }, { status: 500 });
  }
}
