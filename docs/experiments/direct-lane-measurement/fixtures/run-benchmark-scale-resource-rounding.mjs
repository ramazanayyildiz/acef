import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outdir = await mkdtemp(join(tmpdir(), 'acef-scale-resource-rounding-'));
const entry = join(outdir, 'entry.ts');
const outfile = join(outdir, 'entry.mjs');

try {
  await writeFile(entry, `
    import { scaleResourceAmount } from ${JSON.stringify(resolve('packages/sim/src/config.ts'))};
    const scaled = scaleResourceAmount({ wood: 5, stone: 3 }, 0.5);
    if (scaled.wood !== 3) throw new Error('5 * 0.5 must round to 3; got ' + scaled.wood);
    if (scaled.stone !== 2) throw new Error('3 * 0.5 must round to 2; got ' + scaled.stone);
  `, 'utf8');
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm', target: 'node20', logLevel: 'silent' });
  await import(pathToFileURL(outfile).href);
  console.log('resource scaling rounding verified');
} finally {
  await rm(outdir, { recursive: true, force: true });
}
