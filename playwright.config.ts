import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30_000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:5177',
        trace: 'on-first-retry',
        video: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run preview:ci',
        port: 5177,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
    projects: [
        {
            name: 'iphone-12',
            use: {
                ...devices['iPhone 12'],
            },
        },
    ],
});


