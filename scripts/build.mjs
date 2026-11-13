#!/usr/bin/env node
/**
 * Generate dist/ and every generated document from tables/ (run `npm run sync` first to refresh tables/).
 *
 *   npm run build
 *
 * Outputs (all deterministic: the same tables/ always gives byte-identical files):
 *   dist/calcbloc-tax-tables-all.csv|json   every row of every table, long format
 *   dist/csv/<country>/<year>[/<region>].csv, dist/json/...   one file per table
 *   dist/tables-summary.csv|json, dist/TABLES.md   one entry per table (tax year, last verified, sources)
 *   dist/datapackage.json, dist/tax-table-rows.schema.json   Frictionless Data Package and Table Schema
 *   dist/DATA_DICTIONARY.md
 *   README.md, CITATION.cff, .zenodo.json, kaggle/*, zenodo/README.md, listings/*, .github/REPO_METADATA.md
 *
 * No dependencies beyond Node.js 22.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CREDIT, LICENCE, SITE, flatRows, jsonLines, loadTables, rowsCsv, stats, summaryCsv, summaryRecord, tableDocument } from "./lib/data.mjs";
import * as docs from "./lib/docs.mjs";
import { KEYWORDS } from "./lib/docs.mjs";
import { ROW_COLUMNS, SUMMARY_COLUMNS, kaggleSchema, tableSchema } from "./lib/schema.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Every generated file as a Map of repository-relative path → content. Writes nothing. */
export function generate(root = ROOT) {
  const config = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).calcblocData;
  const loaded = loadTables(root);
  const st = stats(loaded);
  const ctx = docs.context(loaded, st, config);
  const out = new Map();
  const json = (v) => JSON.stringify(v, null, 2) + "\n";

  // Per-table files and the combined rows.
  const allRows = [];
  const summaries = new Map();
  for (const t of loaded.tables) {
    const rows = flatRows(t);
    allRows.push(...rows);
    summaries.set(t, summaryRecord(t));
    out.set(t.csvPath, rowsCsv(rows));
    out.set(t.jsonPath, json(tableDocument(t)));
  }
  const datasetMeta = {
    name: "calcbloc-tax-tables",
    title: ctx.title,
    version: st.version,
    generated: st.generatedAt,
    last_verified: st.lastVerified,
    licence: LICENCE.name,
    licence_url: LICENCE.url,
    credit: CREDIT,
    homepage: `${SITE}/data`,
    repository: ctx.ghUrl,
    countries: loaded.countries.map((c) => c.country),
    table_count: st.tables,
    row_count: allRows.length,
    columns: ROW_COLUMNS.map((c) => c.name),
  };
  out.set("dist/calcbloc-tax-tables-all.csv", rowsCsv(allRows));
  out.set("dist/calcbloc-tax-tables-all.json", jsonLines(datasetMeta, "rows", allRows));

  const summaryList = loaded.tables.map((t) => summaries.get(t));
  out.set("dist/tables-summary.csv", summaryCsv(summaryList));
  out.set(
    "dist/tables-summary.json",
    jsonLines({ name: "calcbloc-tax-tables-summary", version: st.version, licence: LICENCE.name, credit: CREDIT, table_count: summaryList.length, columns: SUMMARY_COLUMNS.map((c) => c.name) }, "tables", summaryList),
  );
  out.set("dist/TABLES.md", docs.tablesMd(ctx, summaries));
  out.set("dist/DATA_DICTIONARY.md", docs.dataDictionary(ctx));

  // Frictionless Data Package.
  const rowSchema = tableSchema(ROW_COLUMNS);
  out.set("dist/tax-table-rows.schema.json", json(rowSchema));
  const csvDialect = { delimiter: ",", lineTerminator: "\r\n", quoteChar: '"', doubleQuote: true, header: true };
  const resourceName = (t) => [t.entry.country, t.year, t.region?.code].filter(Boolean).join("-").toLowerCase();
  const datapackage = {
    profile: "tabular-data-package",
    name: "calcbloc-tax-tables",
    title: ctx.title,
    description: `Income tax brackets, allowances and social security contribution rates for ${st.countries} countries (${st.tables} tables, ${st.rows} rows), from official government sources. Every row carries its source URL, retrieval date and review status. Rates are decimal fractions (0.2 = 20%).`,
    version: st.version,
    created: st.generatedAt,
    homepage: `${SITE}/data`,
    keywords: KEYWORDS,
    licenses: [{ name: LICENCE.id, path: LICENCE.url, title: LICENCE.title }],
    contributors: [{ title: "itmarkerz technologies", path: "https://itmarkerz.co.in", email: "hello@calcbloc.com", role: "author" }],
    sources: [
      { title: "CalcBloc tax tables (compiled from official government sources; see source_url on each row)", path: `${SITE}/data` },
      { title: "CalcBloc API", path: `${SITE}/developers` },
    ],
    resources: [
      {
        name: "calcbloc-tax-tables-all",
        title: "All tax-table rows (long format)",
        path: "calcbloc-tax-tables-all.csv",
        format: "csv",
        mediatype: "text/csv",
        encoding: "utf-8",
        profile: "tabular-data-resource",
        dialect: csvDialect,
        schema: rowSchema,
      },
      {
        name: "tables-summary",
        title: "One row per table: tax year, last-verified date, official sources",
        path: "tables-summary.csv",
        format: "csv",
        mediatype: "text/csv",
        encoding: "utf-8",
        profile: "tabular-data-resource",
        dialect: csvDialect,
        schema: tableSchema(SUMMARY_COLUMNS),
      },
      {
        name: "calcbloc-tax-tables-all-json",
        title: "All tax-table rows as JSON (same rows as the combined CSV)",
        path: "calcbloc-tax-tables-all.json",
        format: "json",
        mediatype: "application/json",
        encoding: "utf-8",
      },
      ...loaded.tables.map((t) => ({
        name: resourceName(t),
        title: `${t.entry.name}${t.region ? `, ${t.region.name}` : ""} tax tables ${t.data.yearLabel}`,
        path: t.csvPath.replace(/^dist\//, ""),
        format: "csv",
        mediatype: "text/csv",
        encoding: "utf-8",
        profile: "tabular-data-resource",
        dialect: csvDialect,
        schema: "tax-table-rows.schema.json",
        // The canonical, most recent version of this table: its page on calcbloc.com (tax year in the path).
        sources: [{ title: `${t.entry.name}${t.region ? `, ${t.region.name}` : ""} tax tables ${t.data.yearLabel} on calcbloc.com`, path: t.data.pageUrl }],
      })),
    ],
  };
  out.set("dist/datapackage.json", json(datapackage));

  // Documents at the repository root.
  out.set("README.md", docs.readme(ctx));
  out.set("CITATION.cff", docs.citationCff(ctx));
  out.set(".zenodo.json", docs.zenodoJson(ctx));
  out.set("zenodo/README.md", docs.zenodoReadme(ctx));
  const kaggleResources = [
    { path: "calcbloc-tax-tables-all.csv", description: "Every row of every table in long format (one row per band or value).", schema: kaggleSchema(ROW_COLUMNS) },
    { path: "calcbloc-tax-tables-all.json", description: "The same rows as JSON, with dataset metadata." },
    { path: "tables-summary.csv", description: "One row per table: tax year, last-verified date, row counts, official source URLs, page and API links.", schema: kaggleSchema(SUMMARY_COLUMNS) },
    { path: "tables-summary.json", description: "The table summary as JSON." },
    { path: "DATA_DICTIONARY.md", description: "Every column, unit and status value explained." },
  ];
  out.set("kaggle/dataset-metadata.json", docs.kaggleMetadata(ctx, kaggleResources));
  out.set("kaggle/README.md", docs.kaggleReadme(ctx));
  out.set("listings/public-apis.md", docs.publicApisListing(ctx));
  out.set("listings/rapidapi.md", docs.rapidApiListing(ctx));
  out.set(".github/REPO_METADATA.md", docs.repoMetadata(ctx));

  return { files: out, stats: st, loaded };
}

/** Files Kaggle receives (see scripts/stage-kaggle.mjs): the top-level dist files the Kaggle metadata describes. */
export const KAGGLE_FILES = ["calcbloc-tax-tables-all.csv", "calcbloc-tax-tables-all.json", "tables-summary.csv", "tables-summary.json", "DATA_DICTIONARY.md"];

function main() {
  const { files, stats: st } = generate(ROOT);
  fs.rmSync(path.join(ROOT, "dist"), { recursive: true, force: true });
  for (const [rel, content] of files) {
    const abs = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  const distFiles = [...files.keys()].filter((f) => f.startsWith("dist/")).length;
  console.log(
    `build: ${st.countries} countries, ${st.tables} tables (${st.regionalTables} regional), ${st.rows} rows, ${st.underReview} under review; ` +
      `${distFiles} files in dist/, ${files.size - distFiles} documents; version ${st.version}; pending: ${st.pending.map((p) => p.country).join(", ") || "none"}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
