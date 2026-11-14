/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const destino = process.env.NODE_ENV === 'development' ? process.env.PAQRAP_API_PROXY : undefined
    return destino ? [{ source: '/api/:path*', destination: `${destino}/api/:path*` }] : []
  },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
