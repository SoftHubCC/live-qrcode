import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getLiveCode, getActiveTarget } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/qr/:id —— 用户扫码后看到的展示数据
 *
 * 返回：
 *  - type="qr"   -> qrDataUrl 为直接可 <img src> 的地址（上传图优先，否则按内容生成）
 *  - type="link" -> 前端读取 activeTarget.value 渲染「点击访问」
 *  - type="file" -> fileUrl 为下载地址，前端渲染「点击下载」
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const code = await getLiveCode(params.id);
    if (!code) {
      return NextResponse.json({ error: "活码不存在" }, { status: 404 });
    }

    const activeTarget = await getActiveTarget(code.id);
    if (!activeTarget) {
      return NextResponse.json(
        { error: "该活码还没有配置目标" },
        { status: 404 }
      );
    }

    let qrDataUrl: string | undefined;
    let fileUrl: string | undefined;

    if (code.type === "qr") {
      // 上传的二维码图片优先；否则把文本内容生成二维码
      if (activeTarget.image) {
        qrDataUrl = activeTarget.image;
      } else if (activeTarget.value) {
        try {
          qrDataUrl = await QRCode.toDataURL(activeTarget.value, {
            width: 420,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
        } catch (e) {
          console.error("QR generation failed:", e);
        }
      }
    }

    if (code.type === "file") {
      fileUrl = activeTarget.image || activeTarget.value;
    }

    return NextResponse.json({
      id: code.id,
      name: code.name,
      description: code.description,
      type: code.type,
      targetCount: 0,
      activeTarget,
      qrDataUrl,
      fileUrl,
    });
  } catch (error) {
    console.error("GET /api/qr/[id] failed:", error);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}
