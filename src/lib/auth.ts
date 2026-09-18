import { NextResponse } from "next/server";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

/** 校验请求头中的 Bearer 令牌是否等于管理密码 */
export function isAdmin(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
