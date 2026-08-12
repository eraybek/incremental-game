/**
 * Renders every sound preset offline and reports its duration and level, so a
 * retune can be sanity-checked without listening to all nine by hand.
 *
 * Presets are read straight out of `src/audio/sfx.ts` — there is no second copy
 * to drift out of sync, and the script fails loudly if it can no longer find
 * them. ZzFX's buildSamples is pure maths, so only the AudioContext its module
 * constructs at import time needs stubbing.
 *
 *   node scripts/check-sfx.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../src/audio/sfx.ts'), 'utf8');

const bankBlock = source.match(/const BANK = \{([\s\S]*?)\n\} satisfies/);
if (!bankBlock) {
  console.error('Could not find the BANK literal in src/audio/sfx.ts — has it been renamed?');
  process.exit(1);
}

const presets = [...bankBlock[1].matchAll(/^\s*(\w+):\s*\[([^\]]+)\],/gm)].map(([, name, nums]) => [
  name,
  nums.split(',').map((n) => Number(n.trim())),
]);

if (presets.length === 0) {
  console.error('Found the BANK block but no presets inside it.');
  process.exit(1);
}

globalThis.AudioContext = class {};
const { ZZFX } = await import('../node_modules/zzfx/ZzFX.js');

let bad = 0;
for (const [name, params] of presets) {
  const samples = ZZFX.buildSamples(...params);
  const seconds = samples.length / ZZFX.sampleRate;

  let peak = 0;
  let sumSq = 0;
  for (const v of samples) {
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / samples.length);

  const problems = [];
  if (peak < 0.02) problems.push('effectively silent');
  if (peak > 1.6) problems.push('will clip hard');
  if (seconds < 0.02) problems.push('too short to hear');
  if (seconds > 2.5) problems.push('too long for an SFX');
  if (problems.length > 0) bad++;

  console.log(
    `${name.padEnd(12)} ${seconds.toFixed(3)}s  peak ${peak.toFixed(3)}  rms ${rms.toFixed(3)}` +
      (problems.length > 0 ? `  <-- ${problems.join(', ')}` : ''),
  );
}

console.log(
  bad === 0
    ? `\n${presets.length} presets render audible, in-range audio`
    : `\n${bad} of ${presets.length} preset(s) need attention`,
);
process.exit(bad === 0 ? 0 : 1);
