import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

interface LiveCode {
  id: string;
  name: string;
  description: string;
  type: "qr" | "link" | "file";
  created_at: string;
}

interface Target {
  id: string;
  live_code_id: string;
  type: "qr" | "link" | "file";
  value: string;
  image?: string;
  label: string;
  note: string;
  is_active: number;
  created_at: string;
}

async function getLiveCode(id: string): Promise<LiveCode | null> {
  const code = await kv.get<LiveCode>(`live_code:${id}`);
  return code;
}

async function getTargets(codeId: string): Promise<Target[]> {
  const targets = await kv.lrange(`targets:${codeId}`, 0, -1);
  return targets.map((t) => JSON.parse(t));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const code = await getLiveCode(id);

    if (!code) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    const targets = await getTargets(id);
    const activeTarget = targets.find((t) => t.is_active === 1) || targets[0];

    if (!activeTarget) {
      return NextResponse.json({ error: "No targets found" }, { status: 404 });
    }

    // Generate QR code if type is qr
    let qrDataUrl: string | undefined;
    if (activeTarget.type === "qr" && activeTarget.value) {
      try {
        qrDataUrl = await QRCode.toDataURL(activeTarget.value, {
          width: 400,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
      } catch (e) {
        console.error("QR generation failed:", e);
      }
    }

    return NextResponse.json({
      id: code.id,
      name: code.name,
      description: code.description,
      activeTarget,
      qrDataUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch code" }, { status: 500 });
  }
}
