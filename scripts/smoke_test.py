# -*- coding: utf-8 -*-
"""活码系统本地端到端冒烟测试"""
import json
import struct
import urllib.error
import urllib.request
import uuid
import zlib

BASE = "http://localhost:3000"
PW = "admin123"

results = []


def check(label, cond, extra=""):
    results.append((label, bool(cond)))
    print(("  PASS  " if cond else "  FAIL  ") + label + ("  |  " + str(extra) if extra else ""))


def req(method, path, body=None, auth=True, raw=None, ctype="application/json"):
    headers = {}
    if raw is not None:
        data = raw
        headers["Content-Type"] = ctype
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = ctype
    else:
        data = None
    if auth:
        headers["Authorization"] = "Bearer " + PW
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            txt = resp.read().decode("utf-8", "replace")
            try:
                return resp.status, json.loads(txt)
            except Exception:
                return resp.status, txt[:200]
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, txt[:200]


def png_bytes(w=8, h=8):
    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    raw = b""
    for _ in range(h):
        raw += b"\x00" + b"\xff\x00\x00" * w
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def multipart(fields, files, boundary):
    """files: list of (name, filename, content_type, bytes)"""
    out = []
    for k, v in fields.items():
        out.append(("--" + boundary + "\r\n").encode())
        out.append(('Content-Disposition: form-data; name="%s"\r\n\r\n' % k).encode())
        out.append(str(v).encode() + b"\r\n")
    for name, filename, ct, content in files:
        out.append(("--" + boundary + "\r\n").encode())
        out.append(
            ('Content-Disposition: form-data; name="%s"; filename="%s"\r\n' % (name, filename)).encode()
        )
        out.append(("Content-Type: %s\r\n\r\n" % ct).encode())
        out.append(content + b"\r\n")
    out.append(("--" + boundary + "--\r\n").encode())
    return b"".join(out)


print("=" * 60)
print("活码系统 — 本地端到端验证")
print("=" * 60)

print("\n[鉴权]")
s, b = req("POST", "/api/admin/login", {"password": PW}, auth=False)
check("正确密码登录成功", s == 200, b)
s, b = req("POST", "/api/admin/login", {"password": "wrong"}, auth=False)
check("错误密码返回 401", s == 401, b)
s, b = req("POST", "/api/live-codes", {"name": "illegal", "type": "qr"}, auth=False)
check("未授权创建被拦截", s == 401, b)

print("\n[创建活码]")
s, b = req("POST", "/api/live-codes", {"name": "本地测试-二维码", "description": "端到端验证", "type": "qr"})
check("创建二维码类型活码", s == 200, b.get("error") if s != 200 else "")
qr_id = b.get("code", {}).get("id")
print("       id =", qr_id)

s, b = req("POST", "/api/live-codes", {"name": "本地测试-链接", "description": "链接验证", "type": "link"})
check("创建链接类型活码", s == 200, b.get("error") if s != 200 else "")
link_id = b.get("code", {}).get("id")

s, b = req("POST", "/api/live-codes", {"name": "本地测试-链接", "type": "link"})
check("同名活码被拒绝 (409)", s == 409, b)

s, b = req("POST", "/api/live-codes", {"name": "非法类型", "type": "hack"})
check("非法类型被拒绝 (400)", s == 400, b)

print("\n[链接目标]")
s, b = req("POST", "/api/live-codes/%s/targets" % link_id,
           {"value": "www.baidu.com", "label": "百度", "note": "测试备注"})
val = b.get("target", {}).get("value") if s == 200 else None
check("未写协议头自动补 https://", s == 200 and (val or "").startswith("https://"), val)
link_t1 = b.get("target", {}).get("id")

s, b = req("POST", "/api/live-codes/%s/targets" % link_id, {"value": "https://example.com", "label": "示例站"})
link_t2 = b.get("target", {}).get("id")
check("添加第二个链接目标", s == 200, b.get("error") if s != 200 else "")

print("\n[文件上传安全]")
boundary = "----wb" + uuid.uuid4().hex
png = png_bytes()
body = multipart({"type": "qr"}, [("file", "test.png", "image/png", png)], boundary)
s, b = req("POST", "/api/upload", raw=body, ctype="multipart/form-data; boundary=" + boundary)
up_url = b.get("url") if s == 200 else None
check("上传合法 PNG 成功", s == 200, b)
print("       url =", up_url)

body = multipart({"type": "qr"}, [("file", "evil.png", "image/png", b"<?php echo 1; ?>")], boundary)
s, b = req("POST", "/api/upload", raw=body, ctype="multipart/form-data; boundary=" + boundary)
check("伪装成 PNG 的脚本被拒绝", s == 400, b)

body = multipart({"type": "qr"}, [("file", "shell.php", "image/png", png)], boundary)
s, b = req("POST", "/api/upload", raw=body, ctype="multipart/form-data; boundary=" + boundary)
check("非法扩展名 .php 被拒绝", s == 400, b)

body = multipart({"type": "qr"}, [("file", "../../../etc/passwd.png", "image/png", png)], boundary)
s, b = req("POST", "/api/upload", raw=body, ctype="multipart/form-data; boundary=" + boundary)
check("路径穿越文件名被安全处理", s == 200 and "/api/files/" in (b.get("url") or ""), b.get("url"))

print("\n[文件读取]")
try:
    with urllib.request.urlopen(BASE + up_url, timeout=10) as r:
        data = r.read()
        ct = r.headers.get("Content-Type")
    check("上传文件可正常读取", len(data) == len(png), "%s bytes, %s" % (len(data), ct))
except Exception as e:
    check("上传文件可正常读取", False, e)

try:
    urllib.request.urlopen(BASE + "/api/files/..%2F..%2Fpackage.json", timeout=10)
    check("路径穿越读取被拦截", False, "竟然成功了")
except urllib.error.HTTPError as e:
    check("路径穿越读取被拦截", e.code in (400, 403, 404), e.code)
except Exception as e:
    check("路径穿越读取被拦截", True, e)

print("\n[二维码目标]")
s, b = req("POST", "/api/live-codes/%s/targets" % qr_id,
           {"value": up_url, "image": up_url, "label": "第一张码", "note": "8月活动"})
check("添加二维码目标（引用上传图）", s == 200, b.get("error") if s != 200 else "")
check("首个目标自动设为当前", b.get("target", {}).get("is_active") == 1)

s, b = req("GET", "/api/qr/%s" % qr_id, auth=False)
check("用户扫码页返回二维码数据", s == 200 and bool(b.get("qrDataUrl")),
      {"name": b.get("name"), "type": b.get("type"), "hasQr": bool(b.get("qrDataUrl"))})

print("\n[用户扫码页 · 链接类型]")
s, b = req("GET", "/api/qr/%s" % link_id, auth=False)
check("链接类型不生成二维码样式", s == 200 and b.get("type") == "link" and not b.get("qrDataUrl"),
      {"type": b.get("type"), "qr": b.get("qrDataUrl")})

print("\n[编辑]")
s, b = req("PUT", "/api/live-codes/%s" % link_id, {"name": "本地测试-链接-改名", "description": "改过的描述"})
check("修改活码名称与描述", s == 200, b)
s, b = req("PUT", "/api/live-codes/%s" % link_id, {"name": "本地测试-二维码"})
check("改成已存在的名称被拒绝 (409)", s == 409, b)

s, b = req("PUT", "/api/live-codes/%s/targets/%s" % (link_id, link_t1),
           {"label": "百度新标签", "note": "新备注"})
check("修改目标标签与备注", s == 200, b)

print("\n[切换]")
s, b = req("POST", "/api/live-codes/%s/switch" % link_id, {"targetId": link_t2})
check("切换当前目标", s == 200, b)
s, b = req("GET", "/api/qr/%s" % link_id, auth=False)
check("切换后用户看到新目标", b.get("activeTarget", {}).get("label") == "示例站",
      b.get("activeTarget", {}).get("label"))

print("\n[删除目标]")
s, b = req("DELETE", "/api/live-codes/%s/targets/%s" % (link_id, link_t2))
check("删除目标成功", s == 200, b)
s, b = req("GET", "/api/qr/%s" % link_id, auth=False)
check("删除当前目标后自动选中剩余目标",
      b.get("activeTarget", {}).get("label") == "百度新标签",
      b.get("activeTarget", {}).get("label"))

print("\n[列表]")
s, b = req("GET", "/api/live-codes", auth=False)
names = [c["name"] for c in b.get("codes", [])]
check("列表接口正常", s == 200, names)

print("\n[级联删除]")
s, b = req("DELETE", "/api/live-codes/%s" % qr_id)
check("删除二维码活码", s == 200, b)
s, b = req("DELETE", "/api/live-codes/%s" % link_id)
check("删除链接活码", s == 200, b)
s, b = req("GET", "/api/live-codes", auth=False)
check("删除后列表清空", len(b.get("codes", [])) == 0, [c["name"] for c in b.get("codes", [])])
s, b = req("GET", "/api/qr/%s" % qr_id, auth=False)
check("已删除活码的用户页返回 404", s == 404, b)

print("\n" + "=" * 60)
passed = sum(1 for _, okk in results if okk)
total = len(results)
print("结果：%d / %d 通过" % (passed, total))
if passed < total:
    print("失败项：")
    for label, okk in results:
        if not okk:
            print("  -", label)
print("=" * 60)
