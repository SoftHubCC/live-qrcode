import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { LOCAL_UPLOAD_DIR, useRemoteBlob } from "@/lib/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".rtf": "application/rtf",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/**
 * GET /api/files/:name —— 本地开发模式下提供上传文件的访问
 * 线上模式走 Vercel Blob，不会命中此路由。
 */
export async function GET(
  _request: Request,
  { params }: { params: { name: string } }
) {
  if (useRemoteBlob) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 只允许纯文件名，杜绝路径穿越
  const name = params.name;
  if (!name || name !== path.basename(name) || name.includes("..")) {
    return NextResponse.json({ error: "非法文件名" }, { status: 400 });
  }

  const ext = path.extname(name).toLowerCase();
  if (!EXT_TO_MIME[ext]) {
    return NextResponse.json({ error: "不支持的文件类型" }, { status: 403 });
  }

  try {
    const buffer = await fs.readFile(path.join(LOCAL_UPLOAD_DIR, name));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": EXT_TO_MIME[ext],
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
