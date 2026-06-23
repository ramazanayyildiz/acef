import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outdir = await mkdtemp(join(tmpdir(), 'acef-combat-clamp-'));
const entry = join(outdir, 'entry.ts');
const outfile = join(outdir, 'entry.mjs');

try {
  await writeFile(entry, `
    import { CombatSystem } from ${JSON.stringify(resolve('packages/sim/src/ecs/systems/CombatSystem.ts'))};
    const state = {
      effects: [],
      selectedEntities: new Set(),
      requireUnitDefinition: () => ({ tags: [] }),
      requireBuildingDefinition: () => ({ tags: [] }),
    };
    const combat = new CombatSystem(state as any, {} as any);
    const attacker = { id: 'a', type: 'swordsman', team: 'player', col: 0, row: 0, damage: 50, range: 1 };
    const target = { id: 't', type: 'villager', team: 'enemy', col: 0, row: 1, hp: 5, maxHp: 5, isUnit: true };
    (combat as any).dealDamage(attacker, target);
    if (target.hp !== 0) throw new Error('combat damage must clamp HP at zero; got ' + target.hp);
  `, 'utf8');
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm', target: 'node20', logLevel: 'silent' });
  await import(pathToFileURL(outfile).href);
  console.log('combat HP clamp verified');
} finally {
  await rm(outdir, { recursive: true, force: true });
}
