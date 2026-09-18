"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Target {
  id: string;
  type: "qr" | "link" | "file";
  value: string;
  image?: string;
  label: string;
  note: string;
  is_active: number;
}

interface QrPayload {
  id: string;
  name: string;
  description: string;
  type: "qr" | "link" | "file";
  activeTarget: Target;
  qrDataUrl?: string;
  fileUrl?: string;
  error?: string;
}

export default function QrPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<QrPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/qr/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setNotFound(true);
        else setData(json);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-lg text-red-500">活码不存在或暂未配置内容</div>
        <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
          ← 返回首页
        </Link>
      </div>
    );
  }

  const target = data.activeTarget;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{data.name}</h1>
        {data.description && (
          <p className="text-gray-500 mb-6">{data.description}</p>
        )}

        {/* 二维码类型 */}
        {data.type === "qr" && data.qrDataUrl && (
          <>
            <div className="bg-white p-4 rounded-xl inline-block mb-4 border border-gray-100 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qrDataUrl}
                alt="二维码"
                className="w-64 h-64 object-contain"
              />
            </div>
            <p className="text-sm text-gray-500 mb-6">长按识别二维码</p>
          </>
        )}

        {/* 链接类型 */}
        {data.type === "link" && (
          <div className="mb-6">
            <a
              href={target.value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              点击访问
            </a>
            <p className="text-xs text-gray-400 mt-3 break-all">
              {target.value}
            </p>
          </div>
        )}

        {/* 文件类型 */}
        {data.type === "file" && data.fileUrl && (
          <div className="mb-6">
            <a
              href={data.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-lg"
            >
              点击下载
            </a>
            <p className="text-xs text-gray-400 mt-3 break-all">
              {data.fileUrl}
            </p>
          </div>
        )}

        {/* 当前展示目标 */}
        <div className="bg-blue-50 rounded-lg p-4 text-left">
          <p className="text-xs text-gray-500 mb-1">当前展示目标</p>
          <p className="text-base font-semibold text-gray-900 break-words">
            {target.label || "未命名目标"}
          </p>
          {target.note && (
            <p className="text-sm text-gray-500 mt-2 break-words">
              {target.note}
            </p>
          )}
        </div>

        <Link
          href="/"
          className="inline-block mt-6 text-blue-600 hover:text-blue-700 text-sm"
        >
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}
