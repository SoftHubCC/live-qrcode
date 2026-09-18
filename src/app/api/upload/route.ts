import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { putBlob, useRemoteBlob } from "@/lib/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 图片类扩展名白名单（二维码类型） */
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];

/** 文档类扩展名白名单（文件类型） */
const FILE_EXT = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".md",
  ".csv",
  ".rtf",
  ".zip",
  ".rar",
  ".7z",
];

/** 文件头（magic number）校验，防止改扩展名绕过 */
const MAGIC: Record<string, number[][]> = {
  ".jpg": [[0xff, 0xd8, 0xff]],
  ".jpeg": [[0xff, 0xd8, 0xff]],
  ".png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ".gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  ".bmp": [[0x42, 0x4d]],
  ".pdf": [[0x25, 0x50, 0x44, 0x46]],
  ".zip": [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
  ".docx": [[0x50, 0x4b, 0x03, 0x04]],
  ".xlsx": [[0x50, 0x4b, 0x03, 0x04]],
  ".pptx": [[0x50, 0x4b, 0x03, 0x04]],
  ".rar": [
    [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07],
    [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00],
  ],
  ".7z": [[0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]],
};

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
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

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function matchesMagic(ext: string, bytes: Uint8Array): boolean {
  const patterns = MAGIC[ext];
  // 没有登记 magic number 的类型（如纯文本）跳过校验
  if (!patterns) return true;
  return patterns.some((pattern) =>
    pattern.every((byte, index) => bytes[index] === byte)
  );
}

/** POST /api/upload —— 上传二维码图片或附件 */
export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const kind = String(formData.get("type") || "qr"); // "qr" | "file"

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "没有收到文件" }, { status: 400 });
    }

    const ext = extOf(file.name || "");
    const allow = kind === "qr" ? IMAGE_EXT : [...IMAGE_EXT, ...FILE_EXT];

    if (!ext || !allow.includes(ext)) {
      return NextResponse.json(
        { error: `不支持的文件类型：${ext || "未知"}` },
        { status: 400 }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "文件过大，最大 20MB" },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!matchesMagic(ext, bytes)) {
      return NextResponse.json(
        { error: "文件内容与扩展名不符，已拒绝" },
        { status: 400 }
      );
    }

    // 用随机前缀重命名，彻底规避路径穿越与同名覆盖
    const url = await putBlob(`${Date.now()}${ext}`, file);

    return NextResponse.json({
      success: true,
      url,
      name: file.name,
      size: file.size,
      mime: EXT_TO_MIME[ext] || file.type || "application/octet-stream",
      storage: useRemoteBlob ? "vercel-blob" : "local",
    });
  } catch (error) {
    console.error("POST /api/upload failed:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
