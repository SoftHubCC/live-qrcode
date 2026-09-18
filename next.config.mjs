/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 上传接口需要接收 multipart 表单，关闭 body 体积限制带来的干扰
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
