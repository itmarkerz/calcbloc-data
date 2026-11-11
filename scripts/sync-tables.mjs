#!/usr/bin/env node
/**
 * Refresh tables/ from the CalcBloc site repository (the source of truth).
 *
 *   npm run sync                       # site checkout at ../calcbloc
 *   npm run sync -- C:/path/to/calcbloc
 *   CALCBLOC_SITE_DIR=/path/to/calcbloc npm run sync
 *
 * It runs the site's own exporter (scripts/export-public-data.ts, the same code that serves
 * /api/v1/tax-tables on calcbloc.com) into a temporary folder, and only replaces tables/ when the
 * export succeeds, so countries that were withdrawn disappear and a failed export leaves tables/ intact.
 * Pending countries get the public wording from scripts/lib/pending.mjs in manifest.json.
 *
 * Run it against a checkout of the deployed branch (main) so the files match calcbloc.com.
 * Then run `npm run build` and `npm test`, and commit tables/, dist/ and the generated documents.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeManifest } from "./lib/pending.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.resolve(process.argv[2] ?? process.env.CALCBLOC_SITE_DIR ?? path.join(ROOT, "..", "calcbloc"));
const exporter = path.join(siteDir, "scripts", "export-public-data.ts");
const tablesDir = path.join(ROOT, "tables");
const tmpDir = path.join(ROOT, "build", "tables-sync");

if (!fs.existsSync(exporter)) {
  console.error(`sync-tables: ${exporter} not found. Pass the site checkout as an argument or set CALCBLOC_SITE_DIR.`);
  process.exit(1);
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: siteDir, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const commit = git(["rev-parse", "--short", "HEAD"]);
const dirty = git(["status", "--porcelain"]) !== "";
console.log(`sync-tables: site ${siteDir} (branch ${branch || "?"}, commit ${commit || "?"}${dirty ? ", uncommitted changes" : ""})`);
if (branch && branch !== "main") console.warn(`sync-tables: warning: the site checkout is on "${branch}", not main; the files may not match calcbloc.com.`);

fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

// npx is a .cmd shim on Windows, so it needs a shell there.
const run = spawnSync("npx", ["tsx", "--conditions=react-server", "scripts/export-public-data.ts", tmpDir], {
  cwd: siteDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (run.status !== 0) {
  console.error(`sync-tables: the export failed (exit ${run.status}); tables/ was not changed.`);
  process.exit(run.status ?? 1);
}
if (!fs.existsSync(path.join(tmpDir, "manifest.json"))) {
  console.error("sync-tables: the export wrote no manifest.json; tables/ was not changed.");
  process.exit(1);
}

// The site's hold notes for pending countries are internal; publish a neutral sentence instead (scripts/lib/pending.mjs).
const manifestPath = path.join(tmpDir, "manifest.json");
const manifest = sanitizeManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "
");

fs.rmSync(tablesDir, { recursive: true, force: true });
fs.renameSync(tmpDir, tablesDir);
console.log(
  `sync-tables: ${manifest.countries.length} countries, ${manifest.countries.reduce((n, c) => n + c.files.length, 0)} table files, ` +
    `${manifest.pending.length} pending (generated ${manifest.generatedAt}). Next: npm run build && npm test`,
);
