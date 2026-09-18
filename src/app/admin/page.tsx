"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { getToken, setToken, clearToken, authHeaders } from "@/lib/client-auth";

type Kind = "qr" | "link" | "file";

interface Target {
  id: string;
  type: Kind;
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
  type: Kind;
  targets: Target[];
  activeIndex: number;
}

const TYPE_LABEL: Record<Kind, string> = {
  qr: "二维码",
  link: "网址链接",
  file: "文件",
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [liveCodes, setLiveCodes] = useState<LiveCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const fetchCodes = async () => {
    try {
      const res = await fetch("/api/live-codes", { cache: "no-store" });
      const data = await res.json();
      setLiveCodes(data.codes || []);
    } catch {
      notify("加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 从 localStorage 恢复登录态与密码，避免刷新后接口鉴权失效
    const saved = getToken();
    if (saved) {
      setPassword(saved);
      setIsAdmin(true);
      fetchCodes();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setToken(password);
        setIsAdmin(true);
        setLoading(true);
        await fetchCodes();
      } else {
        setError("密码错误");
      }
    } catch {
      setError("网络异常，请重试");
    }
  };

  const handleLogout = () => {
    clearToken();
    setIsAdmin(false);
    setPassword("");
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="输入管理密码"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
              <p className="text-sm text-gray-500 mt-1">
                管理活码与目标，随时切换用户扫码后看到的内容
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                返回首页
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                退出
              </button>
              <button
                onClick={() => setShowCreate((v) => !v)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                {showCreate ? "取消" : "+ 创建活码"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {showCreate && (
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <CreateForm
            onCreated={() => {
              setShowCreate(false);
              fetchCodes();
              notify("活码创建成功");
            }}
            onError={notify}
          />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500">加载中...</div>
        ) : liveCodes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              还没有活码
            </h2>
            <p className="text-gray-500">点击右上角创建第一个活码</p>
          </div>
        ) : (
          <div className="space-y-6">
            {liveCodes.map((code) => (
              <CodeCard
                key={code.id}
                code={code}
                onRefresh={fetchCodes}
                onNotify={notify}
              />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* 创建活码                                                            */
/* ------------------------------------------------------------------ */

function CreateForm({
  onCreated,
  onError,
}: {
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<{ name: string; description: string; type: Kind }>({
    name: "",
    description: "",
    type: "qr",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/live-codes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "创建失败");
        return;
      }
      setForm({ name: "", description: "", type: "qr" });
      onCreated();
    } catch {
      onError("网络异常，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-5">创建新活码</h2>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            活码名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="例如：公司公众号"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            描述
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="这个活码的用途说明..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            类型 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["qr", "link", "file"] as Kind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setForm({ ...form, type: kind })}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  form.type === kind
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {kind === "qr" ? "📷 " : kind === "link" ? "🔗 " : "📄 "}
                {TYPE_LABEL[kind]}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            创建后目标类型固定，不可更改。该类型决定后续添加目标的方式。
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {submitting ? "创建中..." : "创建"}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 活码卡片                                                            */
/* ------------------------------------------------------------------ */

function CodeCard({
  code,
  onRefresh,
  onNotify,
}: {
  code: LiveCode;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}) {
  const [editCode, setEditCode] = useState(false);
  const [codeForm, setCodeForm] = useState({
    name: code.name,
    description: code.description,
  });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Target | null>(null);
  const [editForm, setEditForm] = useState({ label: "", note: "", value: "" });
  const [frontQr, setFrontQr] = useState("");

  const active = code.targets[code.activeIndex] || code.targets[0] || null;
  const frontendUrl =
    typeof window !== "undefined" ? `${window.location.origin}/q/${code.id}` : "";

  useEffect(() => {
    if (!frontendUrl) return;
    QRCode.toDataURL(frontendUrl, { width: 220, margin: 1 })
      .then(setFrontQr)
      .catch(() => setFrontQr(""));
  }, [frontendUrl]);

  const saveCode = async () => {
    const res = await fetch(`/api/live-codes/${code.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(codeForm),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || "保存失败");
      return;
    }
    setEditCode(false);
    onRefresh();
    onNotify("已保存");
  };

  const removeCode = async () => {
    if (!confirm(`确定删除活码「${code.name}」吗？其下所有目标与文件都会被删除。`))
      return;
    const res = await fetch(`/api/live-codes/${code.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      onRefresh();
      onNotify("已删除");
    } else {
      onNotify("删除失败");
    }
  };

  const switchTarget = async (targetId: string) => {
    const res = await fetch(`/api/live-codes/${code.id}/switch`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ targetId }),
    });
    if (res.ok) {
      onRefresh();
      onNotify("已切换");
    } else {
      onNotify("切换失败");
    }
  };

  const removeTarget = async (targetId: string) => {
    if (!confirm("确定删除这个目标吗？")) return;
    const res = await fetch(
      `/api/live-codes/${code.id}/targets/${targetId}`,
      { method: "DELETE", headers: authHeaders() }
    );
    if (res.ok) {
      onRefresh();
      onNotify("目标已删除");
    } else {
      onNotify("删除失败");
    }
  };

  const saveTarget = async () => {
    if (!editing) return;
    const res = await fetch(
      `/api/live-codes/${code.id}/targets/${editing.id}`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || "保存失败");
      return;
    }
    setEditing(null);
    onRefresh();
    onNotify("已保存");
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        {/* 头部 */}
        <div className="flex items-start justify-between gap-4 mb-4">
          {editCode ? (
            <div className="flex-1 space-y-3">
              <input
                value={codeForm.name}
                onChange={(e) =>
                  setCodeForm({ ...codeForm, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                placeholder="活码名称"
              />
              <input
                value={codeForm.description}
                onChange={(e) =>
                  setCodeForm({ ...codeForm, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                placeholder="描述"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveCode}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditCode(false);
                    setCodeForm({
                      name: code.name,
                      description: code.description,
                    });
                  }}
                  className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900 truncate">
                  {code.name}
                </h3>
                <span className="shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {TYPE_LABEL[code.type]}
                </span>
              </div>
              {code.description && (
                <p className="text-sm text-gray-500">{code.description}</p>
              )}
            </div>
          )}

          {!editCode && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditCode(true)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                编辑信息
              </button>
              <button
                onClick={removeCode}
                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm"
              >
                删除活码
              </button>
            </div>
          )}
        </div>

        {/* 前端二维码（固定不变） */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 flex flex-col sm:flex-row items-center gap-4">
          {frontQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={frontQr}
              alt="前端二维码"
              className="w-24 h-24 bg-white p-1 rounded border border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 bg-white rounded border border-gray-200" />
          )}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-gray-700 mb-1">
              前端二维码（固定不变，对外印刷/分享这个）
            </p>
            <p className="font-mono text-xs text-gray-500 break-all">
              {frontendUrl}
            </p>
            <Link
              href={`/q/${code.id}`}
              target="_blank"
              className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              打开用户页预览 →
            </Link>
          </div>
        </div>

        {/* 当前展示 */}
        {active && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">当前展示目标</p>
            <p className="font-semibold text-gray-900">
              {active.label || "未命名目标"}
            </p>
            {active.note && (
              <p className="text-sm text-gray-500 mt-1">{active.note}</p>
            )}
            <p className="text-xs text-gray-400 mt-1 break-all">
              {active.image || active.value}
            </p>
          </div>
        )}

        {/* 目标列表 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              目标列表（{code.targets.length}）
            </p>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAdd ? "收起" : "+ 添加目标"}
            </button>
          </div>

          {showAdd && (
            <AddTargetPanel
              code={code}
              onDone={() => {
                setShowAdd(false);
                onRefresh();
                onNotify("目标已添加");
              }}
              onError={onNotify}
            />
          )}

          {code.targets.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              还没有目标，点击「+ 添加目标」开始配置
            </p>
          ) : (
            <div className="space-y-2">
              {code.targets.map((target, index) => (
                <div
                  key={target.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg ${
                    index === code.activeIndex ? "bg-blue-100" : "bg-gray-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">
                        {target.label || "未命名目标"}
                      </span>
                      {index === code.activeIndex && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                          当前
                        </span>
                      )}
                    </div>
                    {target.note && (
                      <p className="text-xs text-gray-500 mt-1">
                        {target.note}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1 break-all line-clamp-1">
                      {target.image || target.value}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {index !== code.activeIndex && (
                      <button
                        onClick={() => switchTarget(target.id)}
                        className="px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        设为当前
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditing(target);
                        setEditForm({
                          label: target.label,
                          note: target.note,
                          value: target.value,
                        });
                      }}
                      className="px-2.5 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => removeTarget(target.id)}
                      className="px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑目标弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">编辑目标</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签
                </label>
                <input
                  value={editForm.label}
                  onChange={(e) =>
                    setEditForm({ ...editForm, label: e.target.value })
                  }
                  placeholder="例如：8月活动群"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <input
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                  placeholder="便于识别的内容说明"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                />
              </div>
              {code.type !== "qr" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {code.type === "link" ? "链接地址" : "文件地址"}
                  </label>
                  <input
                    value={editForm.value}
                    onChange={(e) =>
                      setEditForm({ ...editForm, value: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={saveTarget}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                保存
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
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

/* ------------------------------------------------------------------ */
/* 添加目标面板（按类型分流）                                            */
/* ------------------------------------------------------------------ */

interface UrlRow {
  value: string;
  label: string;
  note: string;
}

function AddTargetPanel({
  code,
  onDone,
  onError,
}: {
  code: LiveCode;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  // 链接类型
  const [rows, setRows] = useState<UrlRow[]>([
    { value: "", label: "", note: "" },
  ]);
  // qr / file 类型
  const [qrMode, setQrMode] = useState<"upload" | "text">("upload");
  const [qrText, setQrText] = useState("");
  const [qrTextLabel, setQrTextLabel] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadOne = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", code.type === "qr" ? "qr" : "file");
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: authHeaders(false),
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error || `"${file.name}" 上传失败`);
      return null;
    }
    return data.url as string;
  };

  const addTarget = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/live-codes/${code.id}/targets`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error || "添加失败");
      return false;
    }
    return true;
  };

  const submitLinks = async () => {
    const valid = rows.filter((r) => r.value.trim());
    if (valid.length === 0) {
      onError("请至少填写一个链接");
      return;
    }
    setBusy(true);
    for (const row of valid) {
      const ok = await addTarget({
        type: "link",
        value: row.value.trim(),
        label: row.label.trim(),
        note: row.note.trim(),
      });
      if (!ok) break;
    }
    setBusy(false);
    setRows([{ value: "", label: "", note: "" }]);
    onDone();
  };

  const submitQrText = async () => {
    if (!qrText.trim()) {
      onError("请输入二维码内容");
      return;
    }
    setBusy(true);
    const ok = await addTarget({
      type: "qr",
      value: qrText.trim(),
      label: qrTextLabel.trim(),
      note: note.trim(),
    });
    setBusy(false);
    if (ok) {
      setQrText("");
      setQrTextLabel("");
      setNote("");
      onDone();
    }
  };

  const submitFiles = async () => {
    if (files.length === 0) {
      onError("请先选择文件");
      return;
    }
    setBusy(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`上传中 ${i + 1}/${files.length}：${file.name}`);
      const url = await uploadOne(file);
      if (!url) break;
      const nameLabel = label.trim() || file.name.replace(/\.[^.]+$/, "");
      const ok = await addTarget({
        type: code.type,
        value: url,
        image: url,
        label: nameLabel,
        note: note.trim(),
      });
      if (!ok) break;
    }
    setProgress("");
    setBusy(false);
    setFiles([]);
    setLabel("");
    setNote("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onDone();
  };

  /* ---------------- 链接类型 ---------------- */
  if (code.type === "link") {
    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                value={row.value}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], value: e.target.value };
                  setRows(next);
                }}
                placeholder="example.com 或 https://..."
                className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
              <input
                value={row.label}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], label: e.target.value };
                  setRows(next);
                }}
                placeholder="标签"
                className="w-28 px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
              <input
                value={row.note}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], note: e.target.value };
                  setRows(next);
                }}
                placeholder="备注"
                className="w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
              {rows.length > 1 && (
                <button
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  className="px-3 py-2 text-sm text-red-500 hover:text-red-600"
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setRows([...rows, { value: "", label: "", note: "" }])}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            + 添加一行
          </button>
          <button
            onClick={submitLinks}
            disabled={busy}
            className="ml-auto px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {busy ? "提交中..." : "确认添加"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          未填写协议头时会自动补全 https://
        </p>
      </div>
    );
  }

  /* ---------------- 二维码类型 ---------------- */
  if (code.type === "qr") {
    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setQrMode("upload")}
            className={`px-4 py-2 rounded-lg text-sm border-2 ${
              qrMode === "upload"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            上传二维码图片
          </button>
          <button
            onClick={() => setQrMode("text")}
            className={`px-4 py-2 rounded-lg text-sm border-2 ${
              qrMode === "text"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            输入内容生成
          </button>
        </div>

        {qrMode === "upload" ? (
          <FilePicker
            multiple
            accept="image/*"
            files={files}
            setFiles={setFiles}
            inputRef={fileInputRef}
            hint="支持 jpg / png / gif / webp，可一次选多张"
          />
        ) : (
          <div className="space-y-2">
            <input
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              placeholder="二维码内容，例如某个网址"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
            <input
              value={qrTextLabel}
              onChange={(e) => setQrTextLabel(e.target.value)}
              placeholder="标签（例如：8月活动群）"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
          </div>
        )}

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注（选填，便于识别这批二维码是做什么的）"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
        />

        <button
          onClick={qrMode === "upload" ? submitFiles : submitQrText}
          disabled={busy}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {busy ? progress || "提交中..." : "确认添加"}
        </button>
      </div>
    );
  }

  /* ---------------- 文件类型 ---------------- */
  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
      <FilePicker
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.rtf,.zip,.rar,.7z,image/*"
        files={files}
        setFiles={setFiles}
        inputRef={fileInputRef}
        hint="支持 PDF / Word / Excel / PPT / 图片 / 压缩包，最大 20MB，可多选"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="标签（留空则用文件名）"
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注（选填）"
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
        />
      </div>
      <button
        onClick={submitFiles}
        disabled={busy}
        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
      >
        {busy ? progress || "上传中..." : "确认添加"}
      </button>
    </div>
  );
}

function FilePicker({
  multiple,
  accept,
  files,
  setFiles,
  inputRef,
  hint,
}: {
  multiple?: boolean;
  accept: string;
  files: File[];
  setFiles: (files: File[]) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  hint: string;
}) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
        className="block w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm hover:file:bg-blue-100 cursor-pointer"
      />
      <p className="text-xs text-gray-400 mt-2">{hint}</p>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="text-xs text-gray-600">
              • {f.name}（{(f.size / 1024).toFixed(0)} KB）
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
