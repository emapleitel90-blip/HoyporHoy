import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: process.env.HOYPORHOY_TEST_CLIENT ? { '@prisma/client': process.env.HOYPORHOY_TEST_CLIENT } : {},
    },
    test: {
        // Review packages and temporary builds under scratch are not executable test sources.
        include: ['src/tests/**/*.test.{js,mjs,ts}'],
        maxWorkers: 1,
        hookTimeout: 60000,
        testTimeout: 30000,
    },
});
