import { defineConfig, devices } from '@playwright/test';

const channel = process.env.PW_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    // Dùng Chrome đã cài trên máy; đặt PW_CHANNEL="" để dùng Chromium của Playwright
    channel,
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    // Chế độ local (không cấu hình Supabase)
    {
      name: 'local',
      testIgnore: /remote\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel, baseURL: 'http://localhost:4173/' },
    },
    // Chế độ cây chung (007) với Supabase giả lập bằng page.route
    {
      name: 'remote',
      testMatch: /remote\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel, baseURL: 'http://localhost:4174/' },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npx vite build --outDir dist-remote && npx vite preview --outDir dist-remote --port 4174 --strictPort',
      url: 'http://localhost:4174/',
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_SUPABASE_URL: 'http://mock-supabase.test', VITE_SUPABASE_ANON_KEY: 'e2e-anon-key' },
    },
  ],
});
