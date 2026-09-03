import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, rmSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'dist');
const isWatch = process.argv.includes('--watch');

async function build() {
  // Clean dist
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  // Copy package.json with corrected main entry point
  const pkgJson = JSON.parse(
    await import('fs').then((fs) => fs.promises.readFile(join(__dirname, 'package.json'), 'utf-8'))
  );
  pkgJson.main = 'extension.js';
  await import('fs').then((fs) => fs.promises.writeFile(join(outDir, 'package.json'), JSON.stringify(pkgJson, null, 2)));

  // Build webview first (vite outputs directly to dist/webview)
  console.log('Building webview...');
  try {
    execSync('npm run build', {
      cwd: join(__dirname, '..', 'webview'),
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Webview build failed:', error);
    process.exit(1);
  }

  // Bundle extension
  const ctx = await esbuild.context({
    entryPoints: [join(__dirname, 'src/extension.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    outdir: outDir,
    external: ['vscode'],
    sourcemap: false,
    sourcesContent: false,
    treeShaking: true,
    minify: true,
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