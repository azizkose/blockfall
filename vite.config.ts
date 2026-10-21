/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// The site is served from https://<user>.github.io/blockfall/, so assets
// must be requested from the /blockfall/ sub-path in production builds.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/blockfall/' : '/',
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
}));
