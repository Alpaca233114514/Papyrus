/**
 * Verify that backend dependencies are correctly packaged in the Electron app.
 * Checks both app.asar.unpacked and app.asar contents.
 */

const fs = require('fs');
const path = require('path');

const DIST_ELECTRON = path.resolve(__dirname, '..', 'dist-electron');

// Files we expect to find in the packaged app
const REQUIRED_FILES = [
  'backend/node_modules/fastify/package.json',
  'backend/dist/api/server.js',
  'backend/package.json',
];

function findAppAsar() {
  const candidates = [];
  function walk(dir, depth) {
    if (depth > 4) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.name === 'app.asar') {
        candidates.push(fullPath);
      }
    }
  }
  walk(DIST_ELECTRON, 0);
  return candidates[0];
}

function findUnpackedDir() {
  const candidates = [];
  function walk(dir, depth) {
    if (depth > 4) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'app.asar.unpacked') {
          candidates.push(fullPath);
        }
        walk(fullPath, depth + 1);
      }
    }
  }
  walk(DIST_ELECTRON, 0);
  return candidates[0];
}

function checkUnpacked(unpackedDir) {
  const found = [];
  const missing = [];
  for (const relPath of REQUIRED_FILES) {
    const fullPath = path.join(unpackedDir, relPath);
    if (fs.existsSync(fullPath)) {
      found.push(relPath);
    } else {
      missing.push(relPath);
    }
  }
  return { found, missing };
}

function checkAsar(asarPath) {
  let asar;
  try {
    asar = require('@electron/asar');
  } catch (err) {
    return { error: `Failed to load @electron/asar: ${err.message}`, found: [], missing: REQUIRED_FILES };
  }

  let files;
  try {
    files = asar.listPackage(asarPath);
  } catch (err) {
    return { error: `Failed to list asar contents: ${err.message}`, found: [], missing: REQUIRED_FILES };
  }

  const fileSet = new Set(files);
  const found = [];
  const missing = [];
  for (const relPath of REQUIRED_FILES) {
    // asar paths use forward slashes
    const asarPathNormalized = relPath.replace(/\\/g, '/');
    if (fileSet.has(asarPathNormalized)) {
      found.push(relPath);
    } else {
      missing.push(relPath);
    }
  }
  return { error: null, found, missing };
}

function listUnpackedContents(unpackedDir, maxDepth = 4) {
  const results = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = path.relative(unpackedDir, path.join(dir, entry.name));
      results.push(rel);
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), depth + 1);
      }
    }
  }
  walk(unpackedDir, 0);
  return results;
}

function main() {
  console.log('=== Packaged Dependency Verification ===\n');

  if (!fs.existsSync(DIST_ELECTRON)) {
    console.error(`Error: dist-electron directory not found at ${DIST_ELECTRON}`);
    process.exit(1);
  }

  const unpackedDir = findUnpackedDir();
  const asarPath = findAppAsar();

  console.log(`dist-electron: ${DIST_ELECTRON}`);
  console.log(`app.asar: ${asarPath || 'NOT FOUND'}`);
  console.log(`app.asar.unpacked: ${unpackedDir || 'NOT FOUND'}`);
  console.log('');

  let hasError = false;

  // Check unpacked first
  if (unpackedDir) {
    console.log('--- Checking app.asar.unpacked ---');
    const unpacked = checkUnpacked(unpackedDir);
    for (const f of unpacked.found) {
      console.log(`  OK (unpacked): ${f}`);
    }
    for (const m of unpacked.missing) {
      console.log(`  MISSING (unpacked): ${m}`);
      hasError = true;
    }
    console.log('');

    // Diagnostic: list top-level contents of unpacked dir
    const contents = listUnpackedContents(unpackedDir, 2);
    console.log(`app.asar.unpacked top-level contents (${contents.length} items):`);
    for (const item of contents.slice(0, 30)) {
      console.log(`  ${item}`);
    }
    if (contents.length > 30) {
      console.log(`  ... and ${contents.length - 30} more`);
    }
    console.log('');
  }

  // Check asar as fallback / verification
  if (asarPath) {
    console.log('--- Checking app.asar contents ---');
    const asar = checkAsar(asarPath);
    if (asar.error) {
      console.log(`  ERROR: ${asar.error}`);
    }
    for (const f of asar.found) {
      console.log(`  OK (asar): ${f}`);
    }
    for (const m of asar.missing) {
      console.log(`  MISSING (asar): ${m}`);
      if (!unpackedDir) {
        hasError = true;
      }
    }
    console.log('');
  }

  if (hasError) {
    console.log('=== VERIFICATION FAILED ===');
    process.exit(1);
  }

  console.log('=== VERIFICATION PASSED ===');
  process.exit(0);
}

main();
