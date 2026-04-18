import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// package.json declares "type": "module", so __dirname is not defined.
// Derive the config-file directory from import.meta.url for ESM safety.
const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  resolve: {
    alias: {
      // The MCP SDK statically imports `ajv-provider.js` from `server/index.js`,
      // which transitively requires `ajv/dist/refs/data.json` via CJS require().
      // The Cloudflare Workers V8 isolate cannot load that JSON file through the
      // CJS shimmer. We never instantiate AjvJsonSchemaValidator at runtime
      // (we pass CfWorkerJsonSchemaValidator in ServerOptions instead), but the
      // static import still causes a module-load failure.
      //
      // These physical ESM stub files satisfy the import graph without loading
      // the real AJV bundle.
      ajv: path.resolve(rootDir, 'test/__stubs__/ajv.js'),
      'ajv-formats': path.resolve(rootDir, 'test/__stubs__/ajv-formats.js'),
    },
  },
})
