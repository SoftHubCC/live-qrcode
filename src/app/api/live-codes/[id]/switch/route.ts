import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { getLiveCode, getTarget, activateTarget } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/** POST /api/live-codes/:id/switch —— 切换当前展示的目标 */
export async function POST(request: Request, { params }: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const code = await getLiveCode(params.id);
    if (!code) {
      return NextResponse.json({ error: "活码不存在" }, { status: 404 });
    }

    const body = await request.json();
    const targetId = String(body.targetId || "");

    if (!targetId) {
      return NextResponse.json({ error: "缺少 targetId" }, { status: 400 });
    }

    const target = await getTarget(targetId);
    if (!target || target.live_code_id !== code.id) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    await activateTarget(code.id, targetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("switch target failed:", error);
    return NextResponse.json({ error: "切换失败" }, { status: 500 });
  }
}
