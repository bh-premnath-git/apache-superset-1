#!/usr/bin/env node
//
// register-plugin.mjs
//
// Static-registration patcher invoked from the Dockerfile frontend-builder
// stage. It does two things, in order:
//
//   1. Rewrites
//      ``plugins/plugin-chart-state-district-pies/package.json`` so that
//      ``main`` / ``module`` / ``types`` point at ``src/index.ts`` and the
//      React peer-dep range admits React 18 (Superset 6.1's React).
//      Without this, ``npm install`` resolves the workspace symlink to a
//      ``lib/index.js`` that does not exist, and webpack bails with
//      "Module not found".
//
//   2. Edits
//      ``src/visualizations/presets/MainPreset.ts`` to import the plugin
//      class and append a ``new StateDistrictPiesChartPlugin().configure({
//      key: 'state_district_pies' })`` entry to the ``plugins:`` array.
//
// The patcher is idempotent: re-running it on an already-patched tree is a
// no-op. That keeps Docker layer caching honest and lets the script be run
// locally for development as well.
//
// Usage:
//   node register-plugin.mjs <superset-frontend-dir>

import fs from 'node:fs';
import path from 'node:path';

const PLUGIN_PKG_NAME = '@bh-premnath/plugin-chart-state-district-pies';
const PLUGIN_VIZ_KEY = 'state_district_pies';
const PLUGIN_CLASS = 'StateDistrictPiesChartPlugin';
const PLUGIN_DIRNAME = 'plugin-chart-state-district-pies';

const frontendDir = path.resolve(process.argv[2] || '.');
if (!fs.existsSync(path.join(frontendDir, 'package.json'))) {
  console.error(
    `[register-plugin] error: ${frontendDir} does not look like a ` +
      `superset-frontend root (no package.json)`,
  );
  process.exit(1);
}

// ── 1. Rewrite the plugin's package.json for in-tree workspace use ──────────
const pluginPkgPath = path.join(
  frontendDir,
  'plugins',
  PLUGIN_DIRNAME,
  'package.json',
);
if (!fs.existsSync(pluginPkgPath)) {
  console.error(
    `[register-plugin] error: plugin package.json not found at ${pluginPkgPath}`,
  );
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf8'));
let pkgChanged = false;

const desiredEntry = 'src/index.ts';
for (const field of ['main', 'module', 'types']) {
  if (pkg[field] !== desiredEntry) {
    pkg[field] = desiredEntry;
    pkgChanged = true;
  }
}
// Drop "files" — the package isn't published from the host build, and the
// existing list ("esm", "lib", ...) excludes src/, which would make the
// workspace symlink resolve to nothing useful.
if ('files' in pkg) {
  delete pkg.files;
  pkgChanged = true;
}
// Make the React peer dep range admit React 18 (the version Superset 6.1
// ships). Existing range is "^16.14.0 || ^17.0.0".
const widerReact = '^16.14.0 || ^17.0.0 || ^18.0.0';
if (pkg.peerDependencies?.react && pkg.peerDependencies.react !== widerReact) {
  pkg.peerDependencies.react = widerReact;
  pkgChanged = true;
}
if (
  pkg.peerDependencies?.['react-dom'] &&
  pkg.peerDependencies['react-dom'] !== widerReact
) {
  pkg.peerDependencies['react-dom'] = widerReact;
  pkgChanged = true;
}

if (pkgChanged) {
  fs.writeFileSync(pluginPkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`[register-plugin] updated ${pluginPkgPath}`);
} else {
  console.log(`[register-plugin] ${pluginPkgPath} already up to date`);
}

// ── 2. Patch MainPreset.ts to register the plugin statically ────────────────
const presetPath = path.join(
  frontendDir,
  'src',
  'visualizations',
  'presets',
  'MainPreset.ts',
);
if (!fs.existsSync(presetPath)) {
  console.error(
    `[register-plugin] error: MainPreset.ts not found at ${presetPath}`,
  );
  process.exit(1);
}

let preset = fs.readFileSync(presetPath, 'utf8');
const originalPreset = preset;

const importLine = `import ${PLUGIN_CLASS} from '${PLUGIN_PKG_NAME}';`;

if (!preset.includes(importLine)) {
  // Insert the new import immediately after the last existing top-level
  // ``import`` statement so the file remains parseable.
  const importRegex = /^import .+?;$/gm;
  let lastMatchEnd = -1;
  for (const match of preset.matchAll(importRegex)) {
    lastMatchEnd = match.index + match[0].length;
  }
  if (lastMatchEnd === -1) {
    console.error(
      '[register-plugin] error: no import statements found in MainPreset.ts',
    );
    process.exit(1);
  }
  preset =
    preset.slice(0, lastMatchEnd) +
    '\n' +
    importLine +
    preset.slice(lastMatchEnd);
}

const registrationLine = `        new ${PLUGIN_CLASS}().configure({ key: '${PLUGIN_VIZ_KEY}' }),`;

if (!preset.includes(`new ${PLUGIN_CLASS}()`)) {
  // Find the ``plugins: [`` array and inject our entry just before its
  // closing bracket. Uses a non-greedy regex against balanced brackets,
  // which is sufficient because the plugins array is the last entry in
  // the ``super({...})`` call and its contents do not nest ``]``.
  const pluginsRegex = /(plugins:\s*\[)([\s\S]*?)(\n\s*\])/;
  if (!pluginsRegex.test(preset)) {
    console.error(
      '[register-plugin] error: could not locate ``plugins: [...]`` array in MainPreset.ts',
    );
    process.exit(1);
  }
  preset = preset.replace(pluginsRegex, (_, open, body, close) => {
    const trimmed = body.replace(/\s*$/, '');
    const sep = trimmed.endsWith(',') ? '' : ',';
    return `${open}${trimmed}${sep}\n${registrationLine}${close}`;
  });
}

if (preset !== originalPreset) {
  fs.writeFileSync(presetPath, preset);
  console.log(`[register-plugin] patched ${presetPath}`);
} else {
  console.log(`[register-plugin] ${presetPath} already patched`);
}

// ── 3. Cap webpack thread-loader workers ────────────────────────────────────
// Superset's webpack.config.js uses ``'thread-loader'`` as a bare string,
// which defaults to ``os.cpus().length - 1`` worker processes. On hosts
// with many vCPUs and a Docker Desktop memory cap (commonly 8 GB) the
// production build OOMs mid-compilation: a worker is killed, the IPC
// pipe resets, and the parent crashes with ``Error: read ECONNRESET``.
// Pin workers to 2 — enough parallelism to be useful, low enough to fit
// alongside the parent's 8 GB heap.
const webpackConfigPath = path.join(frontendDir, 'webpack.config.js');
if (fs.existsSync(webpackConfigPath)) {
  let webpackCfg = fs.readFileSync(webpackConfigPath, 'utf8');
  const originalCfg = webpackCfg;
  const objectForm = "{ loader: 'thread-loader', options: { workers: 2 } }";
  if (
    !webpackCfg.includes("loader: 'thread-loader'") &&
    webpackCfg.includes("'thread-loader'")
  ) {
    webpackCfg = webpackCfg.replaceAll("'thread-loader'", objectForm);
  }
  if (webpackCfg !== originalCfg) {
    fs.writeFileSync(webpackConfigPath, webpackCfg);
    console.log(`[register-plugin] capped thread-loader workers in ${webpackConfigPath}`);
  } else {
    console.log(`[register-plugin] ${webpackConfigPath} already capped`);
  }
}
