/**
 * Expose local API for Razorpay webhook callbacks (B5).
 *
 * Usage:
 *   node scripts/tunnel-webhooks.mjs [--port 4000] [--provider cloudflared|ngrok]
 *
 * Requires cloudflared or ngrok on PATH.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

const args = process.argv.slice(2);
function readArg(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const port = readArg('--port', process.env.PORT ?? '4000');
const preferred = readArg('--provider', process.env.TUNNEL_PROVIDER ?? 'cloudflared');
const apiPrefix = process.env.API_PREFIX ?? 'api/v1';

function which(cmd) {
  const ext = platform() === 'win32' ? '.exe' : '';
  const paths = (process.env.PATH ?? '').split(platform() === 'win32' ? ';' : ':');
  for (const dir of paths) {
    const full = `${dir.replace(/[/\\]$/, '')}/${cmd}${ext}`;
    if (existsSync(full)) return full;
  }
  return null;
}

function startTunnel(provider) {
  const target = `http://127.0.0.1:${port}`;
  if (provider === 'cloudflared') {
    const bin = which('cloudflared');
    if (!bin) return null;
    console.log(`Starting cloudflared tunnel → ${target}`);
    return spawn(bin, ['tunnel', '--url', target], { stdio: 'inherit', shell: platform() === 'win32' });
  }
  if (provider === 'ngrok') {
    const bin = which('ngrok');
    if (!bin) return null;
    console.log(`Starting ngrok → ${target}`);
    return spawn(bin, ['http', String(port)], { stdio: 'inherit', shell: platform() === 'win32' });
  }
  return null;
}

console.log('Reliyo webhook tunnel (Sprint 5 / B5)');
console.log(`Local API: http://localhost:${port}/${apiPrefix}`);
console.log(`Webhook path to register in Razorpay:`);
console.log(`  {PUBLIC_URL}/${apiPrefix}/payments/webhooks/razorpay`);
console.log('');

const order = preferred === 'ngrok' ? ['ngrok', 'cloudflared'] : ['cloudflared', 'ngrok'];
let child = null;
for (const p of order) {
  child = startTunnel(p);
  if (child) break;
}

if (!child) {
  console.error('Neither cloudflared nor ngrok found on PATH.');
  console.error('Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
  process.exit(1);
}

child.on('exit', (code) => process.exit(code ?? 0));
