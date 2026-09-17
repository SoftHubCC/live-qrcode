"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LiveCode {
  id: string;
  name: string;
  description: string;
  type: "qr" | "link" | "file";
  targets: Target[];
  activeIndex: number;
}

interface Target {
  id: string;
  type: "qr" | "link" | "file";
  value: string;
  image?: string;
  label: string;
  note: string;
  is_active: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [liveCodes, setLiveCodes] = useState<LiveCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "qr" as "qr" | "link" | "file",
  });
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
    // Check if user is admin via session or token
    const token = localStorage.getItem("admin_token");
    if (token) {
      setIsAdmin(true);
      fetchCodes();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword }),
    });
    if (res.ok) {
      localStorage.setItem("admin_token", adminPassword);
      setIsAdmin(true);
      fetchCodes();
    } else {
      alert("密码错误");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/live-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminPassword}`,
      },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setShowCreate(false);
      setFormData({ name: "", description: "", type: "qr" });
      fetchCodes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个活码吗？所有目标也会被删除。")) return;
    const res = await fetch(`/api/live-codes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminPassword}` },
    });
    if (res.ok) {
      fetchCodes();
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">管理后台登录</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理密码
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入管理密码"
              />
            </div>
            <button
              type="submit"
              className="w-full px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              登录
            </button>
          </form>
          <Link
            href="/"
            className="block text-center mt-4 text-blue-600 hover:text-blue-700 text-sm"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-gray-900">⚙️ 管理后台</h1>
              <p className="mt-2 text-gray-600">管理你的活码和目标</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                返回首页
              </Link>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {showCreate ? "取消" : "+ 创建活码"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Create Form */}
      {showCreate && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">创建新活码</h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  活码名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="例如：公司公众号"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  placeholder="这个活码的用途说明..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "qr" | "link" | "file",
                    })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="qr">二维码</option>
                  <option value="link">网址链接</option>
                  <option value="file">文件</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  创建
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Codes List */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {liveCodes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              还没有活码
            </h2>
            <p className="text-gray-500 mb-6">点击右上角创建第一个活码</p>
          </div>
        ) : (
          <div className="space-y-6">
            {liveCodes.map((code) => (
              <CodeCard
                key={code.id}
                code={code}
                password={adminPassword}
                onRefresh={fetchCodes}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CodeCard({
  code,
  password,
  onRefresh,
  onDelete,
}: {
  code: LiveCode;
  password: string;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [newTargets, setNewTargets] = useState<{ value: string; label: string; note: string }[]>(
    [{ value: "", label: "", note: "" }]
  );
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", note: "" });

  const activeTarget = code.targets[code.activeIndex] || code.targets[0];

  const handleAddTargets = async () => {
    const validTargets = newTargets.filter((t) => t.value.trim());
    if (validTargets.length === 0) return;

    for (const target of validTargets) {
      const targetData = {
        type: code.type,
        value: target.value.startsWith("http") ? target.value : `https://${target.value}`,
        label: target.label,
        note: target.note,
      };

      const res = await fetch(`/api/live-codes/${code.id}/targets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify(targetData),
      });

      if (res.ok) {
        onRefresh();
        setShowAddTarget(false);
        setNewTargets([{ value: "", label: "", note: "" }]);
      }
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!confirm("确定删除这个目标？")) return;
    const res = await fetch(`/api/live-codes/${code.id}/targets/${targetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${password}` },
    });
    if (res.ok) onRefresh();
  };

  const handleSwitch = async (targetId: string) => {
    const res = await fetch(`/api/live-codes/${code.id}/switch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ targetId }),
    });
    if (res.ok) onRefresh();
  };

  const handleEditTarget = async (targetId: string) => {
    const res = await fetch(`/api/live-codes/${code.id}/targets/${targetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({
        label: editForm.label,
        note: editForm.note,
      }),
    });
    if (res.ok) {
      setEditingTarget(null);
      onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这个活码吗？所有目标也会被删除。")) return;
    await onDelete(code.id);
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{code.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{code.description}</p>
            <p className="text-xs text-gray-400 mt-1">类型：{code.type === "qr" ? "二维码" : code.type === "link" ? "网址链接" : "文件"}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
            >
              删除
            </button>
          </div>
        </div>

        {/* Frontend QR Code Link */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">前端二维码指向：</p>
          <p className="font-mono text-sm text-gray-800 break-all">
            {typeof window !== "undefined"
              ? `${window.location.origin}/q/${code.id}`
              : "/q/{code_id}"}
          </p>
        </div>

        {/* Active Target Preview */}
        {activeTarget && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">当前展示目标</p>
            <p className="font-medium text-gray-900">
              {activeTarget.label || "默认"}
            </p>
            {activeTarget.note && (
              <p className="text-sm text-gray-500 mt-1">{activeTarget.note}</p>
            )}
            {activeTarget.value && (
              <p className="text-sm text-gray-500 mt-1 break-all">{activeTarget.value}</p>
            )}
          </div>
        )}

        {/* Targets List */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              目标列表 ({code.targets.length})
            </p>
            <button
              onClick={() => setShowAddTarget(!showAddTarget)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + 添加目标
            </button>
          </div>

          {showAddTarget && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-3">
                {newTargets.map((target, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={target.value}
                      onChange={(e) => {
                        const newTargets = [...newTargets];
                        newTargets[index].value = e.target.value;
                        setNewTargets(newTargets);
                      }}
                      placeholder={
                        code.type === "qr"
                          ? "二维码内容..."
                          : code.type === "link"
                          ? "https://..."
                          : "文件URL..."
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    />
                    <input
                      type="text"
                      value={target.label}
                      onChange={(e) => {
                        const newTargets = [...newTargets];
                        newTargets[index].label = e.target.value;
                        setNewTargets(newTargets);
                      }}
                      placeholder="标签"
                      className="w-24 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    />
                    <input
                      type="text"
                      value={target.note}
                      onChange={(e) => {
                        const newTargets = [...newTargets];
                        newTargets[index].note = e.target.value;
                        setNewTargets(newTargets);
                      }}
                      placeholder="备注"
                      className="w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() =>
                    setNewTargets([...newTargets, { value: "", label: "", note: "" }])
                  }
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  + 添加一行
                </button>
                <button
                  onClick={handleAddTargets}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  确认添加
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {code.targets.map((target, index) => (
              <div
                key={target.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                  index === code.activeIndex
                    ? "bg-blue-100"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {target.label || "默认"}
                    </span>
                    {index === code.activeIndex && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        当前
                      </span>
                    )}
                  </div>
                  {target.note && (
                    <p className="text-xs text-gray-500 mt-1">{target.note}</p>
                  )}
                  {target.value && (
                    <p className="text-xs text-gray-400 mt-1 break-all">{target.value}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSwitch(target.id)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    设为活跃
                  </button>
                  <button
                    onClick={() => {
                      setEditingTarget(target.id);
                      setEditForm({ label: target.label, note: target.note });
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteTarget(target.id)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Target Modal */}
      {editingTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">编辑目标</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签
                </label>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) =>
                    setEditForm({ ...editForm, label: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleEditTarget(editingTarget)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => setEditingTarget(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
