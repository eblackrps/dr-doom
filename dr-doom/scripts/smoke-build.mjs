import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function fileExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const pkg = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  const distIndexPath = path.join(projectRoot, 'dist', 'index.html');
  const assetsPath = path.join(projectRoot, 'dist', 'assets');
  const saveSystemPath = path.join(projectRoot, 'src', 'save', 'save-system.js');
  const titleScreenPath = path.join(projectRoot, 'src', 'ui', 'title-screen.js');
  const shellHtmlPath = path.join(projectRoot, 'index.html');
  const readmePath = path.join(projectRoot, 'README.md');

  const errors = [];

  const distExists = await fileExists(distIndexPath);
  if (!distExists) {
    errors.push('Missing dist/index.html. Run `npm run build` first.');
  }

  if (distExists) {
    const distHtml = await readFile(distIndexPath, 'utf8');
    if (!/assets\/index-[^"]+\.js/.test(distHtml)) {
      errors.push('dist/index.html is missing the main JS bundle reference.');
    }
    if (!/assets\/three-[^"]+\.js/.test(distHtml)) {
      errors.push('dist/index.html is missing the Three.js vendor bundle reference.');
    }
  }

  const assetFiles = await readdir(assetsPath).catch(() => []);
  if (!assetFiles.some((file) => /^index-.*\.js$/.test(file))) {
    errors.push('dist/assets does not contain the built application bundle.');
  }
  if (!assetFiles.some((file) => /^three-.*\.js$/.test(file))) {
    errors.push('dist/assets does not contain the built Three.js bundle.');
  }

  const [saveSystem, titleScreen, shellHtml, readme] = await Promise.all([
    readFile(saveSystemPath, 'utf8'),
    readFile(titleScreenPath, 'utf8'),
    readFile(shellHtmlPath, 'utf8'),
    readFile(readmePath, 'utf8'),
  ]);

  if (!saveSystem.includes(`'${pkg.version}'`)) {
    errors.push(`src/save/save-system.js is not synced to package version ${pkg.version}.`);
  }
  if (!titleScreen.includes(`'${pkg.version}'`)) {
    errors.push(`src/ui/title-screen.js is not synced to package version ${pkg.version}.`);
  }
  if (!shellHtml.includes(`v${pkg.version}`)) {
    errors.push(`index.html boot subtitle is not synced to package version ${pkg.version}.`);
  }
  if (!readme.includes(`v${pkg.version}`)) {
    errors.push(`README.md is not synced to package version ${pkg.version}.`);
  }

  if (errors.length > 0) {
    console.error('Smoke checks failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Smoke checks passed.');
  console.log(`- version: ${pkg.version}`);
  console.log(`- asset bundles: ${assetFiles.filter((file) => file.endsWith('.js')).length}`);
  console.log('- dist/index.html references the expected production bundles');
  console.log('- source version strings are in sync');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
