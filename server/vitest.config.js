import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Review packages and temporary builds under scratch are not executable test sources.
        include: ['src/tests/**/*.test.{js,mjs,ts}'],
    },
});
