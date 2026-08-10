import { defineConfig, type ProxyOptions } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Live-data proxies. Browsers cannot call these hosts directly (no CORS), so the dev
 * and preview servers relay them. In production you would host the same two rewrites
 * on your edge (nginx, CF worker, etc.).
 *
 *  /live → Transiter's public NYC instance: the MTA's GTFS-Realtime feeds, as JSON.
 *  /mta  → the MTA's own endpoints (service-alerts JSON).
 */
const proxy: Record<string, ProxyOptions> = {
  '/live': {
    target: 'https://demo.transiter.dev',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/live/, ''),
  },
  '/mta': {
    target: 'https://api-endpoints.mta.info',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/mta/, ''),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5177, host: '127.0.0.1', proxy },
  preview: { proxy },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
