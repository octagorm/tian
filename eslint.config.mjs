import { defineConfig, globalIgnores } from 'eslint/config'
import { tanstackConfig } from '@tanstack/eslint-config'
import convexPlugin from '@convex-dev/eslint-plugin'

export default defineConfig([
  ...tanstackConfig,
  ...convexPlugin.configs.recommended,
  // Generated, built or copied files
  globalIgnores([
    'convex/_generated',
    'dist',
    '.astro',
    '.cache',
    '.claude',
    '.wrangler',
    'public',
  ]),
])
