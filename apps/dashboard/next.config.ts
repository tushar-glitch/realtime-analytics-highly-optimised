import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.QUERY_API_URL ?? 'http://localhost:3002'}/api/:path*`,
      },
    ]
  },
}

export default config
