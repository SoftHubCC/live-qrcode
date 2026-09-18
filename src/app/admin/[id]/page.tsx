"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getToken, authHeaders } from "@/lib/client-auth";

interface Target {
  id: string;
  type: string;
  value: string;
  image?: string;
  label: string;
  note: string;
  is_active: number;
}

interface CodeDetail {
  id: string;
  name: string;
  description: string;
  type: string;
  targets: Target[];
  activeIndex: number;
}

export default function AdminCodeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [code, setCode] = useState<CodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/live-codes/${id}`, { cache: "no-store" });
      const data = await res.json();
      setCode(res.ok ? data : null);
    } catch {
      setCode(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSwitch = async (targetId: string) => {
    setBusy(true);
    try {
      await fetch(`/api/live-codes/${id}/switch`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ targetId }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        加载中...
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-500">活码不存在</div>
        <Link href="/admin" className="text-blue-600 text-sm">
          ← 返回管理后台
        </Link>
      </div>
    );
  }

  if (!getToken()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-gray-600">请先登录管理后台</div>
        <Link href="/admin" className="text-blue-600 text-sm">
          ← 去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="text-blue-600 hover:text-blue-700 text-sm">
          ← 返回管理后台
        </Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">{code.name}</h1>
        <p className="text-gray-500 mb-8">{code.description}</p>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">切换展示目标</h2>
          {code.targets.length === 0 ? (
            <p className="text-gray-400 text-sm">
              还没有目标，请到管理后台添加。
            </p>
          ) : (
            <div className="space-y-3">
              {code.targets.map((target, index) => {
                const isActive = index === code.activeIndex;
                return (
                  <button
                    key={target.id}
                    onClick={() => !isActive && handleSwitch(target.id)}
                    disabled={busy || isActive}
                    className={`w-full text-left px-5 py-4 rounded-lg transition-all border-2 ${
                      isActive
                        ? "bg-green-50 border-green-500"
                        : "bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900">
                          {target.label || "未命名目标"}
                        </span>
                        {target.note && (
                          <p className="text-sm text-gray-500 mt-1">
                            {target.note}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 break-all">
                          {target.image || target.value}
                        </p>
                      </div>
                      {isActive && (
                        <span className="shrink-0 px-3 py-1 bg-green-500 text-white rounded-full text-xs">
                          当前使用中
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            用户扫描固定的前端二维码后，会看到当前选中的目标内容。
          </p>
        </div>
      </div>
    </div>
  );
}
