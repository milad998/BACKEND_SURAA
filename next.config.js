// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['localhost'], // أضف النطاقات التي تستخدمها للصور
  },
}

module.exports = nextConfig
