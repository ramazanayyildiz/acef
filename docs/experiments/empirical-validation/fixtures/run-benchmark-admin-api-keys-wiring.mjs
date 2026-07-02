import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const route = readFileSync('app/api/admin/settings/api-keys/route.ts', 'utf8');
const shell = readFileSync('app/components/admin-shell.tsx', 'utf8');

const checks = [
  [route.includes('requireAdminAccess("api_keys.read")'), 'route must enforce the api_keys.read permission'],
  [shell.includes('path: "/admin/settings/api-keys"'), 'admin sidebar settings tree must include the API keys route'],
  [shell.includes('href: "/admin/settings/api-keys"'), 'admin command menu must include the API keys entry'],
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

console.log('admin api-keys wiring verified');
