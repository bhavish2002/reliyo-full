import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Load env files in order (later files do not override existing keys).
 * Handles Windows CRLF line endings.
 */
export function loadEnvFiles(
  files = ['.env.staging.local', '.env.staging', '.env.local', '.env'],
  root = backendRoot,
) {
  for (const file of files) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}
