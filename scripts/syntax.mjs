#!/usr/bin/env node
/**
 * Parse every .js file under src/ and scripts/, and every JSON file the
 * extension ships. A file that does not parse takes the whole add-on down,
 * so this runs before anything else in CI.
 *
 * Plain Node instead of `find ... -exec node --check`, so it also works on
 * Windows without a POSIX shell.
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let failed = 0;
const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "scripts")), ...walk(join(ROOT, "_locales"))];

for (const file of files) {
  const rel = relative(ROOT, file);
  if (/\.(m?js)$/.test(file)) {
    const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (r.status !== 0) { failed++; console.log(`✗ ${rel}\n${r.stderr}`); }
  } else if (file.endsWith(".json")) {
    try { JSON.parse(readFileSync(file, "utf8")); }
    catch (e) { failed++; console.log(`✗ ${rel}: ${e.message}`); }
  }
}

console.log(failed ? `${failed} file(s) failed to parse` : `${files.length} files parse`);
process.exit(failed ? 1 : 0);
