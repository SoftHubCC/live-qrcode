import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { getTarget, updateTarget, deleteTarget } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string; targetId: string };
}

/** PUT /api/live-codes/:id/targets/:targetId —— 修改目标的标签、备注、内容 */
export async function PUT(request: Request, { params }: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const target = await getTarget(params.targetId);
    if (!target || target.live_code_id !== params.id) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    const body = await request.json();

    if (body.label !== undefined) target.label = String(body.label).trim();
    if (body.note !== undefined) target.note = String(body.note).trim();
    if (body.value !== undefined) {
      const value = String(body.value).trim();
      if (value) {
        target.value =
          target.type === "link" && !/^https?:\/\//i.test(value)
            ? `https://${value}`
            : value;
      }
    }

    await updateTarget(target);
    return NextResponse.json({ success: true, target });
  } catch (error) {
    console.error("PUT target failed:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/live-codes/:id/targets/:targetId —— 删除目标 */
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const target = await getTarget(params.targetId);
    if (!target || target.live_code_id !== params.id) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }
    await deleteTarget(params.id, params.targetId);

    // 若删掉的是当前活跃目标，自动把第一个目标设为活跃
    const { listTargets, activateTarget } = await import("@/lib/db");
    const rest = await listTargets(params.id);
    if (rest.length > 0 && !rest.some((t) => t.is_active === 1)) {
      await activateTarget(params.id, rest[0].id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE target failed:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
