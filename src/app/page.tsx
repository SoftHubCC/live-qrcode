"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";

interface Target {
  id: string;
  type: "qr" | "link" | "file";
  value: string;
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
  createdAt: string;
}

export default function Home() {
  const [liveCodes, setLiveCodes] = useState<LiveCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchCodes = async () => {
    try {
      const res = await fetch("/api/live-codes");
      const data = await res.json();
      setLiveCodes(data.codes || []);
    } catch (error) {
      console.error("Failed to fetch codes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword }),
    });
    if (res.ok) {
      setIsAdmin(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个活码吗？")) return;
    const res = await fetch(`/api/live-codes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminPassword}` },
    });
    if (res.ok) {
      fetchCodes();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔗 活码系统</h1>
              <p className="mt-2 text-gray-600">
                一个活码对应N个目标，随时切换展示
              </p>
            </div>
            {!isAdmin ? (
              <form onSubmit={handleAdminLogin} className="flex gap-2">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="输入管理密码"
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  登录
                </button>
              </form>
            ) : (
              <Link
                href="/admin"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                管理后台
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Live Codes Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {liveCodes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              还没有活码
            </h2>
            <p className="text-gray-500">登录后可以在管理后台创建活码</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveCodes.map((code) => (
              <LiveCodeCard
                key={code.id}
                code={code}
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function LiveCodeCard({
  code,
  isAdmin,
  onDelete,
}: {
  code: LiveCode;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const activeTarget = code.targets[code.activeIndex] || code.targets[0];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{code.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{code.description}</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            活跃中
          </span>
        </div>

        {/* Preview */}
        <div className="bg-gray-100 rounded-lg p-4 text-center mb-4">
          <div className="text-4xl mb-2">
            {activeTarget?.type === "qr"
              ? "📷"
              : activeTarget?.type === "link"
              ? "🔗"
              : "📄"}
          </div>
          <p className="text-sm text-gray-600">
            当前展示：<strong>{activeTarget?.label || "默认"}</strong>
          </p>
          {activeTarget?.note && (
            <p className="text-xs text-gray-400 mt-1">{activeTarget.note}</p>
          )}
        </div>

        {/* Targets List */}
        {code.targets.length > 1 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              可用的目标：
            </p>
            <div className="space-y-2">
              {code.targets.map((target, index) => (
                <div
                  key={target.id}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    index === code.activeIndex
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {target.label || target.type}
                  {target.note && (
                    <span className="text-xs text-gray-400 ml-2">
                      ({target.note})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Links */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Link
            href={`/q/${code.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            预览
          </Link>
          {isAdmin && (
            <button
              onClick={() => onDelete(code.id)}
              className="flex-1 text-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
