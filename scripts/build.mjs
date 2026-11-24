#!/usr/bin/env node
/**
 * Build Firefox/ from the source tree.
 *
 *   node scripts/build.mjs            build
 *   node scripts/build.mjs --check    verify the committed Firefox/ matches; exit 1 if not
 *
 * src/, icons/ and _locales/ are copied as they are. Two things are generated:
 *
 *   manifest.json   content_scripts come from build/modules.json
 *   popup.html      the <!--SCRIPTS--> marker becomes one <script> tag per
 *                   file, in the same order
 *
 * So the load order exists in exactly one place. Module folders (filters/,
 * skip/, badges/, lists/) are read from disk, which means adding a module is
 * dropping a file in and running the build. Nothing else to edit.
 *
 * Firefox/ is committed so the repo can be loaded straight from a clone and
 * uploaded to AMO without a build step. --check proves it is what the source
 * says it is.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync,
         copyFileSync, rmSync, existsSync, mkdtempSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "Firefox");
const COPIED = ["src", "icons", "_locales"];
const PAGES = { popup: "src/popup/popup.html" };

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const version = () => JSON.parse(read("package.json")).version;

/* --- file helpers -------------------------------------------------------- */

function walk(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full).split(sep).join("/"));
  }
  return out.sort();
}

const digest = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

function contents(dir) {
  const out = new Map();
  for (const rel of walk(dir)) out.set(rel, digest(join(dir, rel)));
  return out;
}

function copyTree(from, to) {
  for (const rel of walk(from)) {
    const target = join(to, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(from, rel), target);
  }
}

/** Make `to` match `from`, touching only what changed. */
function sync(from, to) {
  const want = contents(from);
  const have = existsSync(to) ? contents(to) : new Map();
  let changed = 0;
  for (const [rel, sha] of want) {
    if (have.get(rel) === sha) continue;
    const target = join(to, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(from, rel), target);
    changed++;
  }
  for (const rel of have.keys()) {
    if (!want.has(rel)) { rmSync(join(to, rel)); changed++; }
  }
  return changed;
}

/* --- load order ---------------------------------------------------------- */

/** Every .js file in a module folder, sorted, as paths relative to src/. */
function moduleFiles(folder) {
  return walk(join(ROOT, "src", folder))
    .filter((f) => f.endsWith(".js"))
    .map((f) => folder + "/" + f);
}

/** The ordered script list for each page, relative to src/. */
function scripts() {
  const mods = JSON.parse(read("build/modules.json"));
  const shared = [...mods.core, ...mods.modules.flatMap(moduleFiles)];
  const out = {};
  for (const [page, own] of Object.entries(mods.pages)) out[page] = [...shared, ...own];
  return out;
}

/* --- manifest ------------------------------------------------------------ */

const HOMEPAGE = "https://github.com/lgubala/BazosRider";
const MATCHES = ["*://bazos.sk/*", "*://*.bazos.sk/*"];
const ICONS = {
  16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png",
  96: "icons/icon-96.png", 128: "icons/icon-128.png"
};

function manifest(lists, ver) {
  return {
    manifest_version: 3,
    name: "Bazoš Rider",
    version: ver,
    description: "__MSG_extDescription__",
    default_locale: "sk",
    homepage_url: HOMEPAGE,
    browser_specific_settings: {
      gecko: {
        id: "bazosrider@lgubala.github.io",
        strict_min_version: "142.0",
        data_collection_permissions: { required: ["none"] }
      },
      gecko_android: { strict_min_version: "142.0" }
    },
    icons: { ...ICONS },
    permissions: ["storage", "unlimitedStorage"],
    content_scripts: [{
      matches: MATCHES,
      js: lists.content.map((f) => "src/" + f),
      run_at: "document_end"
    }],
    action: {
      default_title: "Bazoš Rider",
      default_popup: PAGES.popup,
      default_icon: { 16: ICONS[16], 32: ICONS[32], 48: ICONS[48] }
    }
  };
}

/* --- assembly ------------------------------------------------------------ */

function injectScripts(out, page, files) {
  const path = join(out, PAGES[page]);
  const html = readFileSync(path, "utf8");
  if (!html.includes("<!--SCRIPTS-->")) throw new Error(`${PAGES[page]}: no <!--SCRIPTS--> marker`);
  const tags = files.map((f) => `  <script src="../${f}"></script>`).join("\n");
  writeFileSync(path, html.replace(/^[ \t]*<!--SCRIPTS-->/m, tags));
}

function assemble(out, ver) {
  mkdirSync(out, { recursive: true });
  for (const dir of COPIED) copyTree(join(ROOT, dir), join(out, dir));

  const lists = scripts();
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest(lists, ver), null, 2) + "\n");
  for (const page of Object.keys(PAGES)) injectScripts(out, page, lists[page]);

  /* A listed file that is missing fails only at runtime, silently. Catch it here. */
  const listed = new Set(Object.values(lists).flat());
  const missing = [...listed].filter((f) => !existsSync(join(out, "src", f))).sort();
  if (missing.length) throw new Error(`listed but not present:\n  ${missing.join("\n  ")}`);
  return listed.size;
}

function staged(ver) {
  const tmp = mkdtempSync(join(tmpdir(), "bazosrider-build-"));
  try {
    assemble(join(tmp, "Firefox"), ver);
    return tmp;
  } catch (e) {
    rmSync(tmp, { recursive: true, force: true });
    throw e;
  }
}

function build(ver) {
  const tmp = staged(ver);
  try {
    const fresh = join(tmp, "Firefox");
    return { total: contents(fresh).size, changed: sync(fresh, OUT) };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function check(ver) {
  const tmp = staged(ver);
  try {
    const want = contents(join(tmp, "Firefox"));
    const have = existsSync(OUT) ? contents(OUT) : new Map();
    const problems = [];
    for (const rel of [...new Set([...want.keys(), ...have.keys()])].sort()) {
      if (!have.has(rel)) problems.push("missing from the committed build: " + rel);
      else if (!want.has(rel)) problems.push("committed but not generated: " + rel);
      else if (want.get(rel) !== have.get(rel)) problems.push("differs: " + rel);
    }
    return problems;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/* --- cli ----------------------------------------------------------------- */

const ver = version();

if (process.argv.includes("--check")) {
  const problems = check(ver);
  if (problems.length) {
    console.log("Firefox/ is out of date:");
    for (const p of problems) console.log("  " + p);
    console.log("\nrun: npm run build");
    process.exit(1);
  }
  console.log("Firefox/ matches the source");
} else {
  const { total, changed } = build(ver);
  console.log(`firefox  v${ver}  ${total} files, ${changed} updated`);
}
