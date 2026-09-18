/**
 * 统一文件存储层
 *
 * - 线上（Vercel）：配置 BLOB_READ_WRITE_TOKEN 后使用 Vercel Blob
 * - 本地开发：写入 .data/uploads，通过 /api/files/<name> 访问
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";

/** 是否使用远端 Blob（线上模式） */
export const useRemoteBlob = Boolean(BLOB_TOKEN);

export const LOCAL_UPLOAD_DIR = path.join(
  process.cwd(),
  ".data",
  "uploads"
);

const LOCAL_URL_PREFIX = "/api/files/";

function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

/** 保存文件，返回可公开访问的 URL */
export async function putBlob(filename: string, file: File): Promise<string> {
  if (useRemoteBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return blob.url;
  }

  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(8).toString("hex")}${safeExt(filename)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, name), buffer);
  return `${LOCAL_URL_PREFIX}${name}`;
}

/** 根据 URL 删除文件 */
export async function delBlob(url: string): Promise<void> {
  if (!url) return;

  if (useRemoteBlob) {
    try {
      const { del } = await import("@vercel/blob");
      await del(url);
    } catch (e) {
      console.error("Failed to delete blob:", e);
    }
    return;
  }

  if (url.startsWith(LOCAL_URL_PREFIX)) {
    const name = path.basename(url);
    try {
      await fs.unlink(path.join(LOCAL_UPLOAD_DIR, name));
    } catch {
      /* 文件不存在时忽略 */
    }
  }
}
