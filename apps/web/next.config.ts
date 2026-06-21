import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Compile workspace packages through Next.js bundler (no separate build step needed)
  transpilePackages: ['@watchdog/types', '@watchdog/utils'],
}

export default nextConfig
