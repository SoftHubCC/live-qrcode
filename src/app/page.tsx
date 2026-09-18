"use client";

import { useState, useEffect } from "react";
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

interface LiveCode {
  id: string;
  name: string;
  description: string;
  type: "qr" | "link" | "file";
  targets: Target[];
  activeIndex: number;
}

const TYPE_META: Record<
  string,
  { label: string; icon: string; badge: string }
> = {
  qr: { label: "二维码", icon: "📷", badge: "bg-blue-100 text-blue-700" },
  link: { label: "网址链接", icon: "🔗", badge: "bg-purple-100 text-purple-700" },
  file: { label: "文件", icon: "📄", badge: "bg-amber-100 text-amber-700" },
};

export default function Home() {
  const [liveCodes, setLiveCodes] = useState<LiveCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/live-codes")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        setLiveCodes(data.codes || []);
      })
      .catch(() => setError("加载失败，请稍后重试"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">活码系统</h1>
          <p className="mt-2 text-gray-600">
            一个固定二维码，对应多个可随时切换的目标。点击卡片查看当前内容。
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500">加载中...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : liveCodes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              还没有活码
            </h2>
            <p className="text-gray-500">请稍后再来看看</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveCodes.map((code) => {
              const meta = TYPE_META[code.type] ?? TYPE_META.qr;
              const active =
                code.targets[code.activeIndex] || code.targets[0] || null;

              return (
                <Link
                  key={code.id}
                  href={`/q/${code.id}`}
                  className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {code.name}
                      </h3>
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${meta.badge}`}
                      >
                        {meta.icon} {meta.label}
                      </span>
                    </div>

                    {code.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {code.description}
                      </p>
                    )}

                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-3xl mb-1">
                        {active?.image ? "🖼️" : meta.icon}
                      </div>
                      <p className="text-xs text-gray-500">当前展示</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">
                        {active?.label || "未命名目标"}
                      </p>
                      {active?.note && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {active.note}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        共 {code.targets.length} 个目标
                      </span>
                      <span className="text-blue-600 group-hover:text-blue-700 font-medium">
                        查看 →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
