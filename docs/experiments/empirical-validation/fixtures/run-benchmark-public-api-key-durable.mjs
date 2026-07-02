import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const route = readFileSync('app/api/admin/settings/api-keys/route.ts', 'utf8');
const lib = readFileSync('lib/public-api-keys.ts', 'utf8');

const checks = [
  [route.includes('INSERT INTO public_api_keys'), 'key creation must persist through the database'],
  [lib.includes('UPDATE public_api_keys'), 'key verification must read through the database'],
  [lib.includes('last_used_at = NOW()'), 'verification must update last_used_at'],
  [!/new Map<.*>\(\)/.test(lib) || lib.includes('pool.query'), 'verification must not be a process-local map'],
];

let failed = false;
for (const [ok, message] of checks) {
  if (!ok) {
    console.error(`FAIL: ${message}`);
    failed = true;
  }
}
if (failed) process.exit(1);

const tests = spawnSync('npx', ['vitest', 'run', 'app/api/admin/__tests__/api-keys-route.test.ts'], { stdio: 'inherit' });
if (tests.status !== 0) process.exit(1);

console.log('public api-key durable persistence verified');
