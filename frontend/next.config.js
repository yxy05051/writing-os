/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.WRITING_OS_BACKEND_URL ||
  `http://127.0.0.1:${process.env.WRITING_OS_BACKEND_PORT || 8000}`

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
