# 活码系统 (Live QR Code)

一个活码对应N个目标，随时切换展示。支持二维码、网址链接、文件三种类型。

## 功能特性

- **用户页面**：扫码查看活码，展示二维码/链接/文件，无管理功能
- **管理后台**：密码保护，创建/编辑/删除活码和目标
- **批量操作**：批量添加多个目标
- **安全上传**：文件类型白名单 + 魔数校验
- **自动补全**：链接自动添加 https:// 前缀

## 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **数据库**: Vercel KV (Redis)
- **文件存储**: Vercel Blob
- **部署**: Vercel

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd qrcode-live
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.local.example` 到 `.env.local`：

```bash
cp .env.local.example .env.local
```

然后在 Vercel 控制台中配置：
- `VERCEL_KV_URL` - Vercel KV 连接字符串
- `VERCEL_KV_REST_API_URL` - KV REST API URL
- `VERCEL_KV_REST_API_TOKEN` - KV API Token
- `VERCEL_BLOB_READ_WRITE_TOKEN` - Blob 读写 Token
- `ADMIN_PASSWORD` - 管理后台密码（默认：admin123）
- `NEXT_PUBLIC_APP_URL` - 你的域名

### 4. 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 部署到 Vercel

```bash
# 推送到 GitHub
git add .
git commit -m "Initial commit"
git push -u origin main

# 在 Vercel 导入项目并配置环境变量
```

## 项目结构

```
qrcode-live/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/login/    # 管理员登录
│   │   │   ├── live-codes/     # 活码 CRUD
│   │   │   └── qr/[id]/        # 用户扫码页面 API
│   │   ├── admin/              # 管理后台页面
│   │   ├── qr/[id]/            # 用户扫码页面
│   │   ├── page.tsx            # 首页（活码列表）
│   │   └── layout.tsx
│   └── ...
├── .env.local                  # 环境变量
├── package.json
└── next.config.ts
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/live-codes` | 获取所有活码 |
| POST | `/api/live-codes` | 创建活码 |
| GET | `/api/live-codes/[id]` | 获取单个活码 |
| PUT | `/api/live-codes/[id]` | 更新活码 |
| DELETE | `/api/live-codes/[id]` | 删除活码 |
| POST | `/api/live-codes/[id]/targets` | 添加目标 |
| PUT | `/api/live-codes/[id]/targets/[targetId]` | 更新目标 |
| DELETE | `/api/live-codes/[id]/targets/[targetId]` | 删除目标 |
| POST | `/api/live-codes/[id]/switch` | 切换活跃目标 |
| GET | `/api/qr/[id]` | 获取活码详情（含二维码） |
| POST | `/api/upload` | 上传文件 |
| POST | `/api/admin/login` | 管理员登录 |

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `ADMIN_PASSWORD` | 管理后台密码 | 是 |
| `VERCEL_KV_URL` | Vercel KV 连接字符串 | 是 |
| `VERCEL_KV_REST_API_URL` | KV REST API URL | 是 |
| `VERCEL_KV_REST_API_TOKEN` | KV API Token | 是 |
| `VERCEL_BLOB_READ_WRITE_TOKEN` | Blob 读写 Token | 是（文件上传） |
| `NEXT_PUBLIC_APP_URL` | 应用域名（用于生成二维码） | 是 |

## 安全说明

- 所有管理 API 需要 Bearer Token 认证
- 文件上传限制类型和大小（最大 50MB）
- 支持的文件类型：jpg, png, gif, webp, pdf, doc, docx, xls, xlsx, txt, zip, rar, 7z
- 文件名包含 UUID 前缀，防止覆盖

## 许可证

MIT
