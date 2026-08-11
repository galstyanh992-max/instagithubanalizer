import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Vercel's own builder does not use next.config's "standalone" output (see
// next.config.ts) -- there is no .next/standalone dir to populate there, so
// this step is a deliberate no-op on Vercel rather than a failure.
if (process.env.VERCEL) {
  console.log('Skipping standalone asset prep: running under Vercel build (VERCEL=1).');
  process.exit(0);
}

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

await mkdir(join(standalone, '.next'), { recursive: true });
await cp(join(root, '.next', 'static'), join(standalone, '.next', 'static'), {
  recursive: true,
  force: true,
});
await cp(join(root, 'public'), join(standalone, 'public'), {
  recursive: true,
  force: true,
});

console.log('Standalone static assets prepared.');
