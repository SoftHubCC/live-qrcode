import { NextResponse } from "next/server";
import { ADMIN_PASSWORD } from "@/lib/auth";
import { useRemoteKV } from "@/lib/store";
import { useRemoteBlob } from "@/lib/blob";

export const dynamic = "force-dynamic";

/** POST /api/admin/login —— 校验管理密码 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = String(body.password || "");

    if (password && password === ADMIN_PASSWORD) {
      return NextResponse.json({
        success: true,
        storage: {
          kv: useRemoteKV ? "vercel-kv" : "local-file",
          blob: useRemoteBlob ? "vercel-blob" : "local-file",
        },
      });
    }

    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
