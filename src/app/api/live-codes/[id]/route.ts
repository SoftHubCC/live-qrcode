import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import {
  getLiveCode,
  listTargets,
  updateLiveCode,
  deleteLiveCode,
  findLiveCodeByName,
} from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/** GET /api/live-codes/:id —— 单个活码详情 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const code = await getLiveCode(params.id);
    if (!code) {
      return NextResponse.json({ error: "活码不存在" }, { status: 404 });
    }
    const targets = await listTargets(code.id);
    const active = targets.find((t) => t.is_active === 1) || targets[0];
    return NextResponse.json({
      ...code,
      targets,
      activeIndex: active ? targets.indexOf(active) : -1,
    });
  } catch (error) {
    console.error("GET /api/live-codes/[id] failed:", error);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}

/** PUT /api/live-codes/:id —— 修改名称、描述 */
export async function PUT(request: Request, { params }: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const code = await getLiveCode(params.id);
    if (!code) {
      return NextResponse.json({ error: "活码不存在" }, { status: 404 });
    }

    const body = await request.json();

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
      }
      const duplicated = await findLiveCodeByName(name, code.id);
      if (duplicated) {
        return NextResponse.json(
          { error: "已存在同名活码，请换一个名称" },
          { status: 409 }
        );
      }
      code.name = name;
    }

    if (body.description !== undefined) {
      code.description = String(body.description).trim();
    }

    await updateLiveCode(code);
    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error("PUT /api/live-codes/[id] failed:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/live-codes/:id —— 删除活码（级联删除目标与文件） */
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const code = await getLiveCode(params.id);
    if (!code) {
      return NextResponse.json({ error: "活码不存在" }, { status: 404 });
    }
    await deleteLiveCode(code.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/live-codes/[id] failed:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
