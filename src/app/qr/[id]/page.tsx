"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function QrPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/qr/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">活码不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{data.name}</h1>
        {data.description && (
          <p className="text-gray-500 mb-6">{data.description}</p>
        )}

        {/* QR Code or Link/File Button */}
        {data.activeTarget?.type === "qr" && data.qrDataUrl ? (
          <>
            <div className="bg-white p-4 rounded-xl inline-block mb-6">
              <img
                src={data.qrDataUrl}
                alt="QR Code"
                className="w-64 h-64"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">长按识别二维码</p>
          </>
        ) : data.activeTarget?.type === "link" ? (
          <div className="mb-6">
            <a
              href={data.activeTarget.value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              点击访问
            </a>
            <p className="text-sm text-gray-500 mt-3 break-all">
              {data.activeTarget.value}
            </p>
          </div>
        ) : data.activeTarget?.type === "file" ? (
          <div className="mb-6">
            <a
              href={data.activeTarget.value}
              download
              className="inline-block px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-lg"
            >
              点击下载
            </a>
            {data.activeTarget.label && (
              <p className="text-sm text-gray-500 mt-3">{data.activeTarget.label}</p>
            )}
          </div>
        ) : null}

        {/* Active target info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">当前展示目标</p>
          <p className="text-lg font-semibold text-gray-900">
            {data.activeTarget?.label || "默认"}
          </p>
          {data.activeTarget?.note && (
            <p className="text-sm text-gray-500 mt-2">{data.activeTarget.note}</p>
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
