/**
 * @file vitest.config.js
 * @description Vitest configuration for Calcify.ai
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}', 'src/**/*.test.{js,ts}'],
  },
});
