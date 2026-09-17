"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function AdminPage() {
  const params = useParams();
  const id = params.id as string;
  const [code, setCode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/live-codes")
      .then((res) => res.json())
      .then((data) => {
        const found = data.codes.find((c: any) => c.id === id);
        setCode(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSwitch = async (targetId: string) => {
    setSaving(true);
    await fetch(`/api/live-codes/${id}/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">活码不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-blue-600 hover:text-blue-700 text-sm">
          ← 返回首页
        </a>
        <h1 className="text-3xl font-bold mt-4 mb-2">{code.name}</h1>
        <p className="text-gray-500 mb-8">{code.description}</p>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">切换展示目标</h2>
          <div className="space-y-3">
            {code.targets.map((target: any, index: number) => (
              <button
                key={target.id}
                onClick={() => handleSwitch(target.id)}
                disabled={saving || index === code.activeIndex}
                className={`w-full text-left px-5 py-4 rounded-lg transition-all ${
                  index === code.activeIndex
                    ? "bg-green-100 border-2 border-green-500 text-green-800"
                    : "bg-gray-50 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-lg">
                      {target.label || target.type}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{target.value}</p>
                  </div>
                  {index === code.activeIndex && (
                    <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm">
                      当前使用中
                    </span>
                  )}
                  {saving && index !== code.activeIndex && (
                    <span className="text-gray-400">切换中...</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            💡 <strong>提示：</strong>点击上方按钮即可切换当前二维码展示的目标。
            用户扫描固定二维码后，会看到当前选中的目标内容。
          </p>
        </div>
      </div>
    </div>
  );
}
