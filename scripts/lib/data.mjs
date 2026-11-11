/**
 * Read tables/ (the synced source of truth) and turn it into flat rows, per-table records and CSV text.
 * Everything here is deterministic: the same tables/ always gives byte-identical output.
 */
import fs from "node:fs";
import path from "node:path";
import { sanitizeManifest } from "./pending.mjs";
import { ROW_COLUMNS, SUMMARY_COLUMNS } from "./schema.mjs";

export const SITE = "https://calcbloc.com";
export const LICENCE = { id: "CC-BY-4.0", name: "CC BY 4.0", title: "Creative Commons Attribution 4.0 International", url: "https://creativecommons.org/licenses/by/4.0/" };
export const CREDIT = "Data by CalcBloc (calcbloc.com/data)";

const byCode = (a, b) => (a.country < b.country ? -1 : a.country > b.country ? 1 : 0);

/**
 * Load the manifest and every table it lists, in a fixed order: countries by code, years as listed in the
 * manifest (current year first), the national table before its regions (regions in manifest order).
 */
export function loadTables(root) {
  const tablesDir = path.join(root, "tables");
  const manifest = JSON.parse(fs.readFileSync(path.join(tablesDir, "manifest.json"), "utf8"));
  // The documents always use the public pending wording, even if tables/ came from a raw site export.
  const publicManifest = sanitizeManifest(structuredClone(manifest));
  const countries = [...manifest.countries].sort(byCode);
  const tables = [];
  for (const c of countries) {
    for (const year of c.years) {
      for (const region of [null, ...c.regions]) {
        const file = region ? `${c.country}/${year}/${region.code}.json` : `${c.country}/${year}.json`;
        const data = JSON.parse(fs.readFileSync(path.join(tablesDir, file), "utf8"));
        const base = region ? `${c.country}/${year}/${region.code}` : `${c.country}/${year}`;
        tables.push({
          entry: c,
          year,
          region,
          file,
          data,
          csvPath: `dist/csv/${base}.csv`,
          jsonPath: `dist/json/${base}.json`,
          apiUrl: `${SITE}/api/v1/tax-tables/${c.country}/${year}${region ? `?region=${encodeURIComponent(region.code)}` : ""}`,
        });
      }
    }
  }
  return { manifest, publicManifest, countries, tables };
}

/** The long-format rows of one table: the export rows plus country, region, currency, year and page columns. */
export function flatRows(t) {
  const d = t.data;
  return d.rows.map((r) => ({
    country: t.entry.country,
    country_name: t.entry.name,
    region_code: t.region ? t.region.code : "",
    region_name: t.region ? t.region.name : "",
    currency: d.currency,
    tax_year: r.tax_year,
    is_current_year: d.isCurrent === true,
    section_id: r.section_id,
    section: r.section,
    group: r.group,
    label: r.label,
    from: r.from,
    to: r.to,
    rate: r.rate,
    value: r.value,
    unit: r.unit,
    basis: r.basis,
    note: r.note,
    effective_from: r.effective_from,
    effective_to: r.effective_to,
    status: r.status,
    source_title: r.source_title,
    source_url: r.source_url,
    retrieved_at: r.retrieved_at,
    page_url: d.pageUrl,
  }));
}

/** One summary record per table (the columns of SUMMARY_COLUMNS). */
export function summaryRecord(t) {
  const rows = t.data.rows;
  const urls = [...new Set(rows.map((r) => r.source_url))].sort();
  return {
    country: t.entry.country,
    country_name: t.entry.name,
    region_code: t.region ? t.region.code : "",
    region_name: t.region ? t.region.name : "",
    tax_year: t.year,
    year_label: t.data.yearLabel,
    is_current_year: t.data.isCurrent === true,
    currency: t.data.currency,
    effective_from: t.data.effectiveFrom,
    effective_to: t.data.effectiveTo,
    table_status: t.data.status,
    row_count: rows.length,
    under_review_rows: rows.filter((r) => r.status === "under_review").length,
    not_applicable_rows: rows.filter((r) => r.status === "not_applicable").length,
    last_verified: rows.map((r) => r.retrieved_at).sort().at(-1) ?? "",
    source_count: urls.length,
    source_urls: urls.join(" "),
    page_url: t.data.pageUrl,
    api_url: t.apiUrl,
    csv_path: t.csvPath.replace(/^dist\//, ""),
    json_path: t.jsonPath.replace(/^dist\//, ""),
  };
}

/** A per-table JSON document for dist/json: table metadata, sources, attribution and the long-format rows. */
export function tableDocument(t) {
  const d = t.data;
  const s = summaryRecord(t);
  return {
    country: t.entry.country,
    country_name: t.entry.name,
    region: t.region ? { code: t.region.code, name: t.region.name } : null,
    currency: d.currency,
    tax_year: t.year,
    year_label: d.yearLabel,
    is_current_year: d.isCurrent === true,
    effective_from: d.effectiveFrom,
    effective_to: d.effectiveTo,
    table_status: d.status,
    under_review_sections: d.underReview ?? [],
    last_verified: s.last_verified,
    row_count: s.row_count,
    page_url: d.pageUrl,
    api_url: t.apiUrl,
    sources: d.sources,
    licence: LICENCE.name,
    licence_url: LICENCE.url,
    credit: CREDIT,
    columns: ROW_COLUMNS.map((c) => c.name),
    rows: flatRows(t),
  };
}

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Same rule as the calcbloc.com CSV download: neutralise spreadsheet formulas (a text cell starting with = + - @),
  // never a negative number. No current value is affected; the rule is here for future rows.
  const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) || /^\s|\s$/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** RFC 4180 CSV: header row, CRLF line endings, UTF-8, no BOM, no comment lines. */
export function toCsv(columns, records) {
  const names = columns.map((c) => c.name);
  const lines = [names.join(",")];
  for (const r of records) lines.push(names.map((n) => csvCell(r[n])).join(","));
  return lines.join("\r\n") + "\r\n";
}

export const rowsCsv = (records) => toCsv(ROW_COLUMNS, records);
export const summaryCsv = (records) => toCsv(SUMMARY_COLUMNS, records);

/** JSON with one array item per line, so a yearly update shows up as a readable diff. */
export function jsonLines(meta, key, items) {
  const head = JSON.stringify(meta, null, 2).replace(/\n}$/, "");
  const body = items.map((i) => "    " + JSON.stringify(i)).join(",\n");
  return `${head}${Object.keys(meta).length ? "," : ""}\n  ${JSON.stringify(key)}: [\n${body}\n  ]\n}\n`;
}

/** Totals used by the documents. */
export function stats({ manifest, publicManifest, countries, tables }) {
  const rows = tables.reduce((n, t) => n + t.data.rows.length, 0);
  const regionalTables = tables.filter((t) => t.region).length;
  const yearsSet = new Set(countries.map((c) => c.current_year));
  const lastVerified = countries.map((c) => c.lastVerified).filter(Boolean).sort().at(-1);
  const sourceUrls = new Set(tables.flatMap((t) => t.data.rows.map((r) => r.source_url)));
  const underReview = tables.reduce((n, t) => n + t.data.rows.filter((r) => r.status === "under_review").length, 0);
  return {
    countries: countries.length,
    tables: tables.length,
    nationalTables: tables.length - regionalTables,
    regionalTables,
    rows,
    underReview,
    sources: sourceUrls.size,
    currentYears: [...yearsSet].sort(),
    lastVerified,
    generatedAt: manifest.generatedAt,
    version: manifest.generatedAt.replace(/-/g, "."),
    pending: publicManifest.pending,
  };
}
