# 活码系统 (Live QR Code)

一个**固定不变**的前端二维码，背后可以挂 N 个目标，随时切换用户扫码后看到的内容。

支持三种活码类型：**二维码 / 网址链接 / 文件**。

---

## 核心概念

| 概念 | 说明 |
|------|------|
| **前端二维码** | 对外印刷、分享的固定二维码，永远指向 `https://你的域名/q/{code_id}`，扫它的人不会变 |
| **目标** | 背后实际展示的内容。一个活码可以有 N 个目标（比如 N 张二维码图片） |
| **切换** | 在后台把任意一个目标设为「当前」，用户再扫码看到的就是它 |

---

## 技术栈

- **框架**：Next.js 14（App Router）+ React 18 + TypeScript
- **样式**：Tailwind CSS v4
- **数据**：Vercel KV（线上） / 本地 JSON 文件（开发）
- **文件**：Vercel Blob（线上） / 本地磁盘（开发）
- **部署**：Vercel

### 存储自动降级

代码里做了统一存储层（`src/lib/store.ts`、`src/lib/blob.ts`）：

- 检测到 `KV_REST_API_URL` / `BLOB_READ_WRITE_TOKEN` → 走云端
- 没检测到（本地开发默认）→ 自动落到 `.data/` 目录

**因此本地开发零配置即可跑通，部署到 Vercel 后无需改一行代码。**

---

## 本地开发

```bash
npm install
cp .env.local.example .env.local   # Windows: copy .env.local.example .env.local
npm run dev
```

打开 http://localhost:3000

### 页面入口

| 路径 | 说明 |
|------|------|
| `/` | 首页，列出所有活码（**纯展示，无任何管理入口**） |
| `/q/{id}` | 用户扫码后看到的页面 |
| `/admin` | 管理后台（需密码，默认 `admin123`） |

### 一键验证

项目自带端到端冒烟测试，覆盖鉴权、CRUD、上传安全、切换、级联删除等 31 项断言：

```bash
# 先确保 npm run dev 正在运行
python scripts/smoke_test.py
```

---

## 部署到 Vercel

### 1. 推送代码

```bash
git add .
git commit -m "feat: 活码系统"
git push
```

### 2. 在 Vercel 导入项目

https://vercel.com → **Add New...** → **Project** → 选中 `live-qrcode` → **Import**

Framework Preset 会自动识别为 **Next.js**，无需改动。

### 3. 配置环境变量（Settings → Environment Variables）

| 变量名 | 值 | 必填 |
|--------|-----|------|
| `ADMIN_PASSWORD` | 你自己的后台密码 | ✅ |
| `NEXT_PUBLIC_APP_URL` | `https://你的域名` | 建议填 |

> KV / Blob 的变量不需要手填，下一步创建存储时 Vercel 会自动注入。

### 4. 创建存储

**Storage → Create Database → KV**（Development 免费档即可）
创建后会自动向项目注入 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`。

**Storage → Create Bucket → Blob**
用于存放上传的二维码图片和附件，会自动注入 `BLOB_READ_WRITE_TOKEN`。

> 不创建 Blob 也能部署，但文件上传会失败（线上没有可写磁盘）。

### 5. Deploy

部署完成后访问 `https://你的域名/admin`，用 `ADMIN_PASSWORD` 登录。

### 6. 绑定自定义域名

**Settings → Domains** → 添加 `softhub.cc` → 按提示配置 DNS。

绑定后记得把 `NEXT_PUBLIC_APP_URL` 改成新域名并重新部署，否则后台生成的前端二维码仍指向旧地址。

---

## API 端点

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|:----:|------|
| GET | `/api/live-codes` | - | 所有活码（含目标） |
| POST | `/api/live-codes` | ✅ | 创建活码 |
| GET | `/api/live-codes/[id]` | - | 单个活码详情 |
| PUT | `/api/live-codes/[id]` | ✅ | 改名称 / 描述（名称唯一） |
| DELETE | `/api/live-codes/[id]` | ✅ | 删除活码（级联删目标与文件） |
| GET | `/api/live-codes/[id]/targets` | - | 目标列表 |
| POST | `/api/live-codes/[id]/targets` | ✅ | 新增目标 |
| PUT | `/api/live-codes/[id]/targets/[targetId]` | ✅ | 改标签 / 备注 / 内容 |
| DELETE | `/api/live-codes/[id]/targets/[targetId]` | ✅ | 删除目标 |
| POST | `/api/live-codes/[id]/switch` | ✅ | 切换当前目标 |
| GET | `/api/qr/[id]` | - | 用户扫码页所需数据 |
| POST | `/api/upload` | ✅ | 上传图片 / 附件 |
| GET | `/api/files/[name]` | - | 本地模式下的文件访问 |
| POST | `/api/admin/login` | - | 校验管理密码 |

鉴权方式：请求头 `Authorization: Bearer <ADMIN_PASSWORD>`

---

## 安全措施

- **类型白名单**：图片仅 `jpg/jpeg/png/gif/webp/bmp`；附件额外允许 `pdf/doc(x)/xls(x)/ppt(x)/txt/md/csv/rtf/zip/rar/7z`
- **魔数校验**：读取文件头比对真实类型，改扩展名上传脚本会被拦截
- **重命名存储**：落盘文件名由随机串 + 白名单内扩展名组成，彻底规避路径穿越与同名覆盖
- **读取加固**：`/api/files/[name]` 只接受纯文件名，拒绝 `..`、路径分隔符与白名单外扩展名
- **体积限制**：单文件最大 20MB
- **管理接口**：全部要求 Bearer 令牌，未授权一律 401

---

## 项目结构

```
src/
├── lib/
│   ├── store.ts        # KV / 本地文件 统一存储层
│   ├── blob.ts         # Blob / 本地磁盘 统一文件层
│   ├── db.ts           # 活码与目标的业务数据访问
│   ├── auth.ts         # 管理鉴权
│   ├── client-auth.ts  # 前端令牌读写
│   └── types.ts        # 类型定义
└── app/
    ├── page.tsx        # 首页（纯展示）
    ├── q/[id]/         # 用户扫码页
    ├── admin/          # 管理后台
    └── api/            # 接口
scripts/
└── smoke_test.py       # 端到端验证脚本
```

---

## 许可证

MIT
