import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outdir = await mkdtemp(join(tmpdir(), 'acef-gather-modifier-'));
const entry = join(outdir, 'entry.ts');
const outfile = join(outdir, 'entry.mjs');

try {
  await writeFile(entry, `
    import { GatherSystem } from ${JSON.stringify(resolve('packages/sim/src/ecs/systems/GatherSystem.ts'))};
    const deposits: number[] = [];
    const state = {
      effects: [],
      selectedEntities: new Set(),
      entities: new Map(),
      tileMap: { hasResource: () => false, terrainIdAt: () => 'trees' },
      isEconomyUnit: () => true,
      homeBuildingType: () => 'towncenter',
      isDropoffBuilding: () => true,
      getTeamBuildings: () => [{ isBuilt: true, type: 'towncenter', col: 0, row: 0 }],
      getGatherModifier: () => 1.5,
      addResources: (_team: string, _type: string, amount: number) => { deposits.push(amount); },
    };
    const movement = { commandMoveNear: () => {} };
    const gather = new GatherSystem(state as any, movement as any);
    const villager = { id: 'v', type: 'villager', team: 'player', isUnit: true, col: 0, row: 1, state: 'returning', carrying: { type: 'wood', amount: 10 } };
    (gather as any).updateReturning(villager as any, 16);
    if (deposits.length !== 1) throw new Error('expected exactly one deposit; got ' + deposits.length);
    if (deposits[0] !== 15) throw new Error('deposit must apply the team gather modifier (Math.round(10 * 1.5) = 15); got ' + deposits[0]);
    if (villager.carrying !== undefined) throw new Error('carrying must be cleared after deposit');
  `, 'utf8');
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm', target: 'node20', logLevel: 'silent' });
  await import(pathToFileURL(outfile).href);
  console.log('gather deposit modifier verified');
} finally {
  await rm(outdir, { recursive: true, force: true });
}
