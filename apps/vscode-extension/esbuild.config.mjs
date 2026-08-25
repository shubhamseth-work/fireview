import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, rmSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'dist');
const isWatch = process.argv.includes('--watch');

async function build() {
  // Clean dist
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  // Copy package.json
  copyFileSync(join(__dirname, 'package.json'), join(outDir, 'package.json'));

  // Bundle extension
  const ctx = await esbuild.context({
    entryPoints: [join(__dirname, 'src/extension.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    outdir: outDir,
    external: ['vscode'],
    sourcemap: true,
    sourcesContent: false,
    treeShaking: true,
    minify: false,
  });

  if (isWatch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }

  // Copy resources
  const resourcesSrc = join(__dirname, 'resources');
  const resourcesDest = join(outDir, 'resources');
  if (existsSync(resourcesSrc)) {
    cpSync(resourcesSrc, resourcesDest, { recursive: true });
  }

  if (!isWatch) {
    console.log('Extension bundled successfully');
  }
}

build().catch(() => process.exit(1));