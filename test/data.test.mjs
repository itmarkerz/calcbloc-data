/**
 * Checks on the synced tables/ and the generated dist/ (run with `npm test`, after `npm run build`).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { generate } from "../scripts/build.mjs";
import { loadTables } from "../scripts/lib/data.mjs";
import { publicPendingReason } from "../scripts/lib/pending.mjs";
import { ROW_COLUMNS, SUMMARY_COLUMNS } from "../scripts/lib/schema.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const loaded = loadTables(ROOT);
const { manifest } = loaded;
const released = new Set(manifest.countries.map((c) => c.country));

/** Minimal RFC 4180 parser (quoted fields, doubled quotes, CRLF). Returns an array of string arrays. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r" && text[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else field += ch;
  }
  assert.equal(quoted, false, "unterminated quoted field");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p).replace(/\\/g, "/")];
  });
}

const cellOf = (v) => (v === null || v === undefined ? "" : String(v));

test("every row in tables/ has an official source_url, retrieved_at and a known status", () => {
  let n = 0;
  for (const t of loaded.tables) {
    for (const r of t.data.rows) {
      const where = `${t.file} §${r.section_id} "${r.label}"`;
      // Same gate as the site export (exportGateErrors), plus: the URL must parse.
      assert.match(r.source_url, /^https?:\/\/[^\s]+\.[^\s]+/, `${where}: source_url`);
      assert.doesNotThrow(() => new URL(r.source_url), `${where}: source_url does not parse`);
      assert.ok(r.source_title && r.source_title.trim(), `${where}: source_title`);
      assert.match(r.retrieved_at, /^\d{4}-\d{2}-\d{2}$/, `${where}: retrieved_at`);
      assert.match(r.effective_from, /^\d{4}-\d{2}-\d{2}$/, `${where}: effective_from`);
      assert.ok(["verified", "under_review", "not_applicable"].includes(r.status), `${where}: status ${r.status}`);
      assert.ok(["rate", "money", "number", "text"].includes(r.unit), `${where}: unit ${r.unit}`);
      // A rate above 1 is allowed only for a multiple of another amount (a surcharge on a tax, a share of a benefit, a municipal multiplier such as the German Hebesatz),
      // so a percentage written by mistake (15 for 0.15) is still caught.
      if (r.rate !== null) {
        const multiple = /surcharge|share of|multiplier/i.test(r.label);
        assert.ok(r.rate >= 0 && r.rate <= (multiple ? 5 : 1), `${where}: rate ${r.rate} is not a decimal fraction`);
      }
      n++;
    }
  }
  assert.ok(n > 0, "no rows found");
});

test("manifest matches the files in tables/", () => {
  const listed = manifest.countries.flatMap((c) => c.files).sort();
  const onDisk = listFiles(path.join(ROOT, "tables")).filter((f) => f !== "manifest.json").sort();
  assert.deepEqual(onDisk, listed, "tables/ files differ from manifest files lists");
  for (const c of manifest.countries) {
    const expected = c.years.flatMap((y) => [`${c.country}/${y}.json`, ...c.regions.map((r) => `${c.country}/${y}/${r.code}.json`)]).sort();
    assert.deepEqual([...c.files].sort(), expected, `${c.country}: files do not cover every year and region`);
    assert.ok(c.years.includes(c.current_year), `${c.country}: current_year not in years`);
    const national = loaded.tables.find((t) => t.entry.country === c.country && t.year === c.current_year && !t.region);
    assert.equal(national.data.rows.length, c.rowCount, `${c.country}: rowCount`);
    assert.equal(national.data.rows.filter((r) => r.status === "under_review").length, c.underReviewRows, `${c.country}: underReviewRows`);
    assert.equal(national.data.pageUrl, c.pageUrl, `${c.country}: pageUrl`);
    const rows = loaded.tables.filter((t) => t.entry.country === c.country).flatMap((t) => t.data.rows);
    assert.equal(rows.map((r) => r.retrieved_at).sort().at(-1), c.lastVerified, `${c.country}: lastVerified`);
    assert.deepEqual([...new Set(rows.map((r) => r.source_url))].sort(), c.sourceUrls, `${c.country}: sourceUrls`);
    for (const t of loaded.tables.filter((x) => x.entry.country === c.country)) {
      assert.equal(t.data.country, c.country, `${t.file}: country`);
      assert.equal(t.data.year, t.year, `${t.file}: year`);
      assert.equal(t.data.region?.code ?? null, t.region?.code ?? null, `${t.file}: region`);
    }
  }
});

test("no country outside the manifest, and pending countries are absent", () => {
  const pending = manifest.pending.map((p) => p.country);
  for (const p of pending) assert.ok(!released.has(p), `${p} is both released and pending`);
  const tableDirs = fs.readdirSync(path.join(ROOT, "tables"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const d of tableDirs) assert.ok(released.has(d), `tables/${d} is not in the manifest`);
  for (const sub of ["dist/csv", "dist/json"]) {
    const dirs = fs.readdirSync(path.join(ROOT, sub), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    assert.deepEqual(dirs.sort(), [...released].sort(), `${sub} countries differ from the manifest`);
  }
  const all = parseCsv(read("dist/calcbloc-tax-tables-all.csv"));
  const ci = all[0].indexOf("country");
  const inCsv = new Set(all.slice(1).map((r) => r[ci]));
  assert.deepEqual([...inCsv].sort(), [...released].sort(), "combined CSV countries differ from the manifest");
  for (const p of pending) assert.ok(!inCsv.has(p), `pending country ${p} found in the combined CSV`);
});

test("pending countries carry the public wording, not the site's internal hold notes (npm run sync applies it)", () => {
  for (const p of manifest.pending) assert.equal(p.reason, publicPendingReason(p.country), `${p.country}: pending reason`);
});

test("every CSV has as many rows as its JSON and the source table, with the same values", () => {
  let total = 0;
  const header = ROW_COLUMNS.map((c) => c.name);
  for (const t of loaded.tables) {
    const csv = parseCsv(read(t.csvPath));
    const doc = JSON.parse(read(t.jsonPath));
    assert.deepEqual(csv[0], header, `${t.csvPath}: header`);
    assert.equal(csv.length - 1, t.data.rows.length, `${t.csvPath}: row count vs tables/${t.file}`);
    assert.equal(doc.rows.length, t.data.rows.length, `${t.jsonPath}: row count vs tables/${t.file}`);
    assert.equal(doc.row_count, doc.rows.length, `${t.jsonPath}: row_count`);
    doc.rows.forEach((r, i) => {
      const cells = csv[i + 1];
      assert.equal(cells.length, header.length, `${t.csvPath} line ${i + 2}: column count`);
      header.forEach((h, j) => {
        const v = cellOf(r[h]);
        const expected = /^[=+\-@]/.test(v) && !/^-?\d/.test(v) ? `'${v}` : v;
        assert.equal(cells[j], expected, `${t.csvPath} line ${i + 2}, ${h}`);
      });
      assert.ok(r.source_url && r.retrieved_at, `${t.jsonPath} row ${i}: source_url / retrieved_at`);
    });
    total += t.data.rows.length;
  }
  const all = parseCsv(read("dist/calcbloc-tax-tables-all.csv"));
  const allJson = JSON.parse(read("dist/calcbloc-tax-tables-all.json"));
  assert.equal(all.length - 1, total, "combined CSV row count");
  assert.equal(allJson.rows.length, total, "combined JSON row count");
  assert.equal(allJson.row_count, total, "combined JSON row_count");
  const si = all[0].indexOf("source_url");
  const ri = all[0].indexOf("retrieved_at");
  all.slice(1).forEach((r, i) => {
    assert.ok(r[si] && r[ri], `combined CSV line ${i + 2}: source_url / retrieved_at`);
  });
});

test("summary has one entry per table and agrees with the tables", () => {
  const csv = parseCsv(read("dist/tables-summary.csv"));
  const json = JSON.parse(read("dist/tables-summary.json"));
  assert.deepEqual(csv[0], SUMMARY_COLUMNS.map((c) => c.name));
  assert.equal(csv.length - 1, loaded.tables.length);
  assert.equal(json.tables.length, loaded.tables.length);
  json.tables.forEach((s, i) => {
    const t = loaded.tables[i];
    assert.equal(s.row_count, t.data.rows.length, `${t.file}: row_count`);
    assert.ok(s.last_verified && s.source_urls, `${t.file}: last_verified / source_urls`);
    assert.ok(fs.existsSync(path.join(ROOT, "dist", s.csv_path)), `${s.csv_path} missing`);
    assert.ok(fs.existsSync(path.join(ROOT, "dist", s.json_path)), `${s.json_path} missing`);
  });
});

test("datapackage.json lists every CSV with a schema that matches its header", () => {
  const dp = JSON.parse(read("dist/datapackage.json"));
  assert.equal(dp.licenses[0].name, "CC-BY-4.0");
  for (const r of dp.resources) {
    assert.ok(fs.existsSync(path.join(ROOT, "dist", r.path)), `resource ${r.name}: ${r.path} missing`);
    if (r.format !== "csv") continue;
    const schema = typeof r.schema === "string" ? JSON.parse(read(path.join("dist", r.schema))) : r.schema;
    const header = parseCsv(read(path.join("dist", r.path)).split("\r\n")[0] + "\r\n")[0];
    assert.deepEqual(header, schema.fields.map((f) => f.name), `resource ${r.name}: header vs schema`);
  }
  const csvResources = dp.resources.filter((r) => r.format === "csv").length;
  assert.equal(csvResources, loaded.tables.length + 2, "one resource per table plus the combined and summary CSVs");
  assert.equal(new Set(dp.resources.map((r) => r.name)).size, dp.resources.length, "resource names are unique");
});

test("dist/ and the generated documents are up to date with tables/ (run npm run build)", () => {
  const { files } = generate(ROOT);
  for (const [rel, content] of files) {
    const abs = path.join(ROOT, rel);
    assert.ok(fs.existsSync(abs), `${rel} is missing: run npm run build`);
    assert.ok(fs.readFileSync(abs, "utf8") === content, `${rel} is out of date: run npm run build`);
  }
  const expectedDist = new Set([...files.keys()].filter((f) => f.startsWith("dist/")));
  for (const f of listFiles(path.join(ROOT, "dist"))) assert.ok(expectedDist.has(`dist/${f}`), `dist/${f} is not generated by the build (stale file)`);
});

test("generated documents state the manifest's figures", () => {
  const readme = read("README.md");
  const n = manifest.countries.length;
  assert.match(readme, new RegExp(`^# CalcBloc Tax Tables — .* for ${n} countries$`, "m"), "README H1 country count");
  for (const c of manifest.countries) assert.ok(readme.includes(`](${c.pageUrl}?utm_source=calcbloc-data&utm_medium=readme&utm_campaign=itmarkerz-oss)`), `README links ${c.pageUrl}`);
  for (const p of manifest.pending) {
    assert.ok(readme.includes(p.name), `README mentions pending ${p.name}`);
    assert.ok(!readme.includes(`/${p.country}/tax-tables/`), `README links pending ${p.country}`);
  }
  const kaggle = JSON.parse(read("kaggle/dataset-metadata.json"));
  assert.ok(kaggle.subtitle.includes(`${n} countries`));
  const zen = JSON.parse(read(".zenodo.json"));
  assert.equal(zen.upload_type, "dataset");
  assert.equal(zen.license, "cc-by-4.0");
  assert.ok(zen.title.includes(`${n} countries`));
  assert.match(read("CITATION.cff"), /^cff-version: 1\.2\.0$/m);
  // itmarkerz technologies is the copyright holder and author; the credit line stays "Data by CalcBloc".
  assert.deepEqual(zen.creators, [{ name: "itmarkerz technologies" }]);
  assert.match(read("CITATION.cff"), /^authors:\n {2}- name: "itmarkerz technologies"$/m);
  assert.match(read("LICENSE"), /^Copyright \(c\) \d{4} itmarkerz technologies\./);
  assert.match(read("LICENSE-CODE"), /^Copyright \(c\) \d{4} itmarkerz technologies$/m);
  assert.ok(zen.notes.includes("Data by CalcBloc (calcbloc.com/data)"));
  const row = read("listings/public-apis.md").match(/^\| \[CalcBloc\]\([^)]+\) \| ([^|]+) \|/m);
  assert.ok(row, "public-apis row present");
  assert.ok(row[1].trim().length <= 100, "public-apis description is at most 100 characters");
});
