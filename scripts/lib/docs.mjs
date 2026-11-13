/**
 * Every generated document (README, data dictionary, dataset cards, citation and listing files). Counts, years,
 * countries and links come from tables/manifest.json and the table files, never from hand-typed numbers, so a
 * re-sync plus `npm run build` updates all of them at once.
 */
import { CREDIT, LICENCE, SITE } from "./data.mjs";
import { GROUP_VALUES, ROW_COLUMNS, STATUS_VALUES, SUMMARY_COLUMNS, UNIT_VALUES } from "./schema.mjs";

const fmt = (n) => n.toLocaleString("en-US");
const byName = (a, b) => a.name.localeCompare(b.name, "en");
const mdCell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

/**
 * The company that builds and maintains CalcBloc: copyright holder, licensor and author of the dataset and code.
 * CalcBloc stays the product name, and the required credit line stays CREDIT ("Data by CalcBloc ...").
 */
const PUBLISHER = { name: "itmarkerz technologies", url: "https://itmarkerz.co.in", github: "https://github.com/itmarkerz" };
const PUBLISHER_DESCRIPTION = "a web and mobile app development company in Kerala, India";

/**
 * Referral tag for human-facing calcbloc.com and itmarkerz.co.in links, so analytics can tell which repository and
 * which surface (readme, docs, listing) sent a visit. API URLs, the OpenAPI URL, download links and citation/machine
 * metadata (CITATION.cff, the .zenodo.json fields other than the description, datapackage.json, the tables'
 * page_url values) stay plain.
 */
const UTM_SOURCE = "calcbloc-data";
const UTM_CAMPAIGN = "itmarkerz-oss";
export function utm(url, medium) {
  const m = /^(https:\/\/(?:www\.)?(?:calcbloc\.com|itmarkerz\.co\.in))([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url);
  if (!m || /[?&]utm_source=/.test(url)) return url;
  const [, origin, path, query, hash] = m;
  const tag = `utm_source=${UTM_SOURCE}&utm_medium=${medium}&utm_campaign=${UTM_CAMPAIGN}`;
  return `${origin}${path || "/"}${query ? `${query}&` : "?"}${tag}${hash ?? ""}`;
}
const rd = (path) => utm(`${SITE}${path}`, "readme");

/** Shared context: totals, links and phrases used by several documents. */
export function context(loaded, stats, config) {
  const repo = config.githubRepo;
  const ghUrl = `https://github.com/${repo}`;
  const blob = (p) => `${ghUrl}/blob/main/${p}`;
  const raw = (p) => `https://raw.githubusercontent.com/${repo}/main/${p}`;
  const yearStarts = [...new Set(stats.currentYears.map((y) => y.slice(0, 4)))].sort();
  const headlineYear = yearStarts.length === 1 ? yearStarts[0] : `${yearStarts[0]}–${yearStarts.at(-1)}`;
  const yearList = stats.currentYears.length === 1 ? stats.currentYears[0] : `${stats.currentYears.slice(0, -1).join(", ")} and ${stats.currentYears.at(-1)}`;
  const title = `CalcBloc Tax Tables: ${headlineYear} income tax and social security data for ${stats.countries} countries`;
  const countriesByName = [...loaded.countries].sort(byName);
  const countryNames = countriesByName.map((c) => c.name);
  const example = loaded.countries.find((c) => c.country === "uk") ?? loaded.countries[0];
  const exampleTable = loaded.tables.find((t) => t.entry === example && t.year === example.current_year && !t.region);
  const exampleBands = exampleTable.data.sections.find((s) => s.kind === "bands") ?? exampleTable.data.sections[0];
  const regional = loaded.countries.find((c) => c.regions.length > 0);
  return {
    ...stats,
    config,
    repo,
    ghUrl,
    blob,
    raw,
    title,
    headlineYear,
    yearList,
    countriesByName,
    countryNames,
    example,
    exampleTable,
    exampleBands,
    regional,
    regionalExample: regional ? regional.regions[0] : null,
    doi: config.doi || null,
    tableList: loaded.tables,
  };
}

const listJoin = (items) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

function pendingLine(ctx) {
  if (!ctx.pending.length) return "";
  const lcfirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  return ctx.pending.map((p) => `${p.name} is not included yet: ${lcfirst(p.reason.replace(/\.$/, ""))}. It will be added as soon as its tables are complete.`).join(" ");
}

const PACKAGE_KINDS = {
  python: { label: "Python", registry: (n) => `[PyPI](https://pypi.org/project/${n}/)`, install: (n) => `pip install ${n}` },
  node: { label: "Node.js / TypeScript", registry: (n) => `[npm](https://www.npmjs.com/package/${n})`, install: (n) => `npm install ${n}` },
  php: { label: "PHP", registry: (n) => `[Packagist](https://packagist.org/packages/${n})`, install: (n) => `composer require ${n}` },
};

function packageLine(ctx, kind) {
  const p = ctx.config.packages[kind];
  const k = PACKAGE_KINDS[kind];
  const label = k.label;
  const registry = k.registry(p.name);
  const install = k.install(p.name);
  return p.published
    ? `- **${label}:** \`${install}\` (${registry}, source: [${p.repo}](https://github.com/${p.repo}))`
    : `- **${label}:** package \`${p.name}\` on ${registry}, *coming soon* (source: [${p.repo}](https://github.com/${p.repo}))`;
}

function coverageRows(ctx, { absolute }) {
  const link = (p) => (absolute ? ctx.blob(p) : p);
  return ctx.countriesByName
    .map((c) => {
      const t = ctx.tableList.find((x) => x.entry === c && x.year === c.current_year && !x.region);
      const years = c.years.join(", ");
      const regions = c.regions.length ? fmt(c.regions.length) : "–";
      return `| [${c.name}](${utm(c.pageUrl, "readme")}) | ${years} | ${c.currency} | ${regions} | ${fmt(c.rowCount)} | ${c.lastVerified ?? ""} | [${c.current_year} tables](${utm(c.pageUrl, "readme")}) | [CSV](${link(t.csvPath)}) · [JSON](${link(t.jsonPath)}) |`;
    })
    .join("\n");
}

/** Said wherever the data is credited: the country page, not the data hub, is the canonical source of each table. */
export const CANONICAL_NOTE = "The canonical, most recent version of each table is its country page on calcbloc.com.";

const COVERAGE_HEAD = "| Country | Tax year(s) | Currency | Regions | Rows (current year, national) | Last checked | On calcbloc.com | Download |\n|---|---|---|---:|---:|---|---|---|";

function citationText(ctx) {
  const doi = ctx.doi ? ` https://doi.org/${ctx.doi}` : ` ${ctx.ghUrl}`;
  return `${PUBLISHER.name} (${ctx.generatedAt.slice(0, 4)}). *${ctx.title}* (Version ${ctx.version}) [Data set].${doi}`;
}

function bibtex(ctx) {
  return [
    `@misc{calcbloc_tax_tables_${ctx.version.replace(/\./g, "_")},`,
    `  author    = {{${PUBLISHER.name}}},`,
    `  title     = {${ctx.title}},`,
    `  year      = {${ctx.generatedAt.slice(0, 4)}},`,
    `  version   = {${ctx.version}},`,
    `  publisher = {${ctx.doi ? "Zenodo" : PUBLISHER.name}},`,
    ctx.doi ? `  doi       = {${ctx.doi}},` : null,
    `  url       = {${ctx.doi ? `https://doi.org/${ctx.doi}` : ctx.ghUrl}},`,
    `  note      = {${CREDIT}. Licensed under ${LICENCE.name}.}`,
    `}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------------------------------------------------
// README.md

export function readme(ctx) {
  const ex = ctx.example;
  const exT = ctx.exampleTable;
  const reg = ctx.regional;
  const regEx = ctx.regionalExample;
  const badges = [
    `[![Licence: CC BY 4.0](https://img.shields.io/badge/licence-CC%20BY%204.0-blue.svg)](${LICENCE.url})`,
    ctx.doi ? `[![DOI](https://zenodo.org/badge/DOI/${ctx.doi}.svg)](https://doi.org/${ctx.doi})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const pending = pendingLine(ctx);
  return `<!-- Generated by scripts/build.mjs from tables/manifest.json. Edit scripts/lib/docs.mjs, not this file. -->

# CalcBloc Tax Tables — ${ctx.headlineYear} income tax and social security data for ${ctx.countries} countries

${badges}

Free, machine-readable **income tax tables** and **social security contribution rates** for ${ctx.countries} countries, compiled by [CalcBloc](${rd("")}) from official government sources. Each table covers one country and tax year (the ${ctx.yearList} tax years) and lists the **tax brackets**, personal allowances and credits, employee and employer contributions with their ceilings, and other payroll figures, with regional tables for states, provinces and cantons where they set their own rates.

Every row states its official source URL, the date it was retrieved and a review status, so each figure can be traced back to the government page it came from. The data is the same that powers the tax-table pages and calculators on [calcbloc.com](${rd("")}) and the [CalcBloc API](${rd("/developers")}).

CalcBloc is a product of [${PUBLISHER.name}](${utm(PUBLISHER.url, "readme")}).

**At a glance:** ${fmt(ctx.countries)} countries · ${fmt(ctx.tables)} tables (${fmt(ctx.nationalTables)} national, ${fmt(ctx.regionalTables)} regional) · ${fmt(ctx.rows)} rows · ${fmt(ctx.sources)} official sources · last verified ${ctx.lastVerified} · CSV and JSON · ${LICENCE.name}

## What the tables contain

- **Income tax brackets** (marginal rates and band limits), including state, provincial, cantonal or regional scales where they exist
- **Allowances, credits and deductions** that set the tax-free amount (personal allowance, basic exemption, tax credits)
- **Social security contribution rates** for employees and employers: pension, health, unemployment and other insurances, with contribution ceilings and thresholds
- **Employer payroll costs**: payroll taxes, levies and employer-only contributions
- **Other figures** shown on the country's calcbloc.com tax-table page, for example VAT, corporation tax or minimum-wage rows

Rates are decimal fractions (0.2 = 20%) and money amounts are in the country's currency. The [data dictionary](dist/DATA_DICTIONARY.md) describes every column.

## Countries covered

${COVERAGE_HEAD}
${coverageRows(ctx, { absolute: false })}

Regional tables (for example ${reg ? `${reg.name}: ${regEx.name}` : "states and provinces"}) hold only the regional figures; combine them with the national table of the same year. They are listed in [dist/TABLES.md](dist/TABLES.md) with their sources, and in [dist/tables-summary.csv](dist/tables-summary.csv).
${pending ? `\n### Pending countries\n\n${pending}\n` : ""}
## Files

| File | What it is |
|---|---|
| [\`dist/calcbloc-tax-tables-all.csv\`](dist/calcbloc-tax-tables-all.csv) | Every row of every table in one long-format CSV (${fmt(ctx.rows)} rows) |
| [\`dist/calcbloc-tax-tables-all.json\`](dist/calcbloc-tax-tables-all.json) | The same rows as JSON, with dataset metadata |
| \`dist/csv/<country>/<year>.csv\` | One CSV per national table, e.g. [\`dist/csv/${ex.country}/${ex.current_year}.csv\`](${exT.csvPath}) |
| \`dist/csv/<country>/<year>/<region>.csv\` | One CSV per regional table |
| \`dist/json/...\` | The same tables as JSON, with the table's sources, status and attribution |
| [\`dist/tables-summary.csv\`](dist/tables-summary.csv) / [\`.json\`](dist/tables-summary.json) | One row per table: tax year, last-verified date, row counts, official source URLs, page and API links |
| [\`dist/TABLES.md\`](dist/TABLES.md) | The same summary as a readable list, with the official sources per country |
| [\`dist/DATA_DICTIONARY.md\`](dist/DATA_DICTIONARY.md) | Every column, unit and status value explained |
| [\`dist/datapackage.json\`](dist/datapackage.json) | [Frictionless Data Package](https://datapackage.org/) descriptor with the field schema |
| \`tables/\` | The source files as exported from calcbloc.com (the API's JSON shape) plus \`manifest.json\` |

All CSV files share one set of columns, so any of them can be appended to the combined file. They are UTF-8 with a header row and CRLF line endings.

## How to use the data

**Download a CSV** from the links above, or load it straight from GitHub. In Python with pandas:

\`\`\`python
import pandas as pd

url = "${ctx.raw("dist/calcbloc-tax-tables-all.csv")}"
df = pd.read_csv(url, dtype={"tax_year": str, "region_code": str})

# ${ex.name}, ${ex.current_year}: ${ctx.exampleBands.title}
bands = df[(df.country == "${ex.country}") & (df.tax_year == "${ex.current_year}") & df.region_code.isna() & (df.section_id == "${ctx.exampleBands.id}")]
print(bands[["label", "from", "to", "rate"]])
\`\`\`

**Use the JSON** in JavaScript or any language that reads JSON:

\`\`\`js
const res = await fetch("${ctx.raw(exT.jsonPath)}");
const table = await res.json();
console.log(table.country_name, table.tax_year, table.last_verified, table.rows.length, "rows");
\`\`\`

**Call the API** for the same tables without downloading anything. It works without a key for 50 requests a day per IP address, on every endpoint; when that runs out, add a [free API key](${rd("/developers/keys")}) for 5,000 a day, sent in the \`X-API-Key\` header:

\`\`\`sh
curl ${SITE}/api/v1/tax-tables/${ex.country}/${ex.current_year}
${reg ? `curl "${SITE}/api/v1/tax-tables/${reg.country}/${reg.current_year}?region=${regEx.code}&format=csv"` : `curl "${SITE}/api/v1/tax-tables/${ex.country}/${ex.current_year}?format=csv"`}
\`\`\`

The API also calculates take-home pay and employer cost. Documentation: [calcbloc.com/developers](${rd("/developers")}) · OpenAPI 3.1 description: [calcbloc.com/api/openapi.json](${SITE}/api/openapi.json).

**Use it from code** with the CalcBloc packages, built from the same tables. Their offline tables need no key and no network; their API clients work without a key for 50 requests a day and, when that runs out, ask for a free API key (5,000 a day), set in code or in \`CALCBLOC_API_KEY\`:

${packageLine(ctx, "python")}
${packageLine(ctx, "node")}
${packageLine(ctx, "php")}

## Status values and verification

Each row has a \`status\`:

${STATUS_VALUES.map(([v, d]) => `- \`${v}\`: ${d}`).join("\n")}

${fmt(ctx.underReview)} of the ${fmt(ctx.rows)} rows are currently \`under_review\`. They are kept in the dataset, with their status, so every table is complete; filter on \`status\` if you need checked figures only. Tables with figures under review say so on their calcbloc.com page too.

## How updates work

The tables are maintained in the calcbloc.com code base, where every figure is entered from an official source together with its URL and retrieval date. This repository holds an export of that data and generates every file from it:

1. \`npm run sync\` runs the site's exporter ([\`scripts/sync-tables.mjs\`](scripts/sync-tables.mjs)) and refreshes \`tables/\` (one JSON file per country, tax year and region, plus \`manifest.json\`).
2. \`npm run build\` ([\`scripts/build.mjs\`](scripts/build.mjs)) regenerates \`dist/\`, this README, the dataset cards and the citation files from \`tables/\`.
3. \`npm test\` checks that every row has a source URL and retrieval date, that the CSV and JSON files hold the same rows, and that the files match the manifest.

A new tax year or a corrected figure is therefore one change: sync, build, test, commit. The per-row \`retrieved_at\` dates and the git history show what changed and when; the [calcbloc.com data changelog](${rd("/data/changelog")}) lists updates to the underlying datasets. Requires Node.js 22 or later; there are no dependencies to install.

## Licence and credit

The data is © ${ctx.generatedAt.slice(0, 4)} ${PUBLISHER.name} and licensed under the [Creative Commons Attribution 4.0 International licence (CC BY 4.0)](${LICENCE.url}): you may copy, share and adapt it, including commercially, as long as you give credit. Please credit it as:

> ${CREDIT}

${CANONICAL_NOTE}

Link the credit to [calcbloc.com/data](${rd("/data")}) or, better, to the table's own country page: the \`page_url\` column, also linked from each country in [Countries covered](#countries-covered). The full licence text is in [LICENSE](LICENSE). The code in \`scripts/\` and \`test/\` is © ${ctx.generatedAt.slice(0, 4)} ${PUBLISHER.name}, released under the [MIT licence](LICENSE-CODE).

The tax rates and thresholds themselves are set by the governments listed in \`source_url\`; the licence covers CalcBloc's compilation, structure and notes. The tables are reference data, not tax advice: check the official source before relying on a figure for a filing or payroll run.

## Citation

${citationText(ctx)}

\`\`\`bibtex
${bibtex(ctx)}
\`\`\`

Citation metadata is also in [CITATION.cff](CITATION.cff); GitHub shows it under "Cite this repository".

## Links

- Data hub and per-dataset sources: [calcbloc.com/data](${rd("/data")})
- API documentation: [calcbloc.com/developers](${rd("/developers")})
- OpenAPI description: [calcbloc.com/api/openapi.json](${SITE}/api/openapi.json)
- Questions and corrections: open an issue in this repository or write to hello@calcbloc.com

## About

[CalcBloc](${rd("")}) is built and maintained by [${PUBLISHER.name}](${utm(PUBLISHER.url, "readme")}), ${PUBLISHER_DESCRIPTION}. The tables behind this dataset are documented at [calcbloc.com/data](${rd("/data")}), and the API at [calcbloc.com/developers](${rd("/developers")}). The CalcBloc packages for Python, JavaScript, PHP, R and Google Sheets, and the CalcBloc MCP server, are in the [itmarkerz GitHub organization](${PUBLISHER.github}).
`;
}

// ---------------------------------------------------------------------------------------------------------------------
// dist/DATA_DICTIONARY.md

export function dataDictionary(ctx) {
  const colTable = (cols) =>
    `| Column | Type | Description | Example |\n|---|---|---|---|\n` +
    cols.map((c) => `| \`${c.name}\` | ${c.type}${c.format ? ` (${c.format})` : ""}${c.required ? ", required" : ""} | ${mdCell(c.description)} | ${c.example === undefined ? "" : c.example === "" ? "*(empty)*" : `\`${mdCell(c.example)}\``} |`).join("\n");
  return `# Data dictionary: CalcBloc Tax Tables

Version ${ctx.version} · ${fmt(ctx.countries)} countries · ${fmt(ctx.tables)} tables · ${fmt(ctx.rows)} rows · ${LICENCE.name} · ${CREDIT}

This file describes the columns of every CSV and JSON file in \`dist/\`. It is generated from the same column list as \`datapackage.json\`.

## Files

- \`calcbloc-tax-tables-all.csv\`: all rows of all tables (long format, one row per band or value).
- \`calcbloc-tax-tables-all.json\`: the same rows as a JSON array (\`rows\`), with dataset metadata.
- \`csv/<country>/<tax_year>.csv\` and \`csv/<country>/<tax_year>/<region_code>.csv\`: one table per file, same columns.
- \`json/...\`: one table per file: table metadata (tax year, effective dates, \`table_status\`, \`last_verified\`, \`sources\`, \`page_url\`, \`api_url\`, licence and credit) and its \`rows\`.
- \`tables-summary.csv\` / \`tables-summary.json\`: one row per table (columns below).
- \`TABLES.md\`: a readable version of the summary with the official sources per country.

CSV files are UTF-8 without a byte-order mark, comma-separated, with a header row, CRLF line endings and RFC 4180 quoting. In CSV an empty cell means no value (\`null\` in JSON). Booleans are \`true\` / \`false\`. Dates are ISO 8601 (\`YYYY-MM-DD\`).

## Row columns

${colTable(ROW_COLUMNS)}

## How to read a row

- **Bands** (\`unit\` = \`rate\`, \`from\` filled): a marginal rate. \`rate\` applies to the slice of the amount described in \`basis\` from \`from\` up to \`to\`; an empty \`to\` means no upper limit. Bands of one \`section_id\` together form a scale; tax on an amount is the sum over the slices.
- **Rate values** (\`unit\` = \`rate\`, \`from\` empty): a single rate, for example a contribution rate. Read it from \`rate\`.
- **Money, number and text values**: read \`value\`. Money is in the table's \`currency\`; \`basis\` and \`label\` say whether it is per year, month or week.

### How rates are expressed

All rates are decimal fractions between 0 and 1: \`0.2\` = 20%, \`0.0765\` = 7.65%, \`0.00125\` = 0.125%. Multiply by 100 for a percentage. Rates are never written as percentages, per-mille values or text, except inside a \`text\` row that describes a rule in words.

### Units

${UNIT_VALUES.map(([v, d]) => `- \`${v}\`: ${d}`).join("\n")}

### Groups

${GROUP_VALUES.map(([v, d]) => `- \`${v}\`: ${d}`).join("\n")}

### Status values

${STATUS_VALUES.map(([v, d]) => `- \`${v}\`: ${d}`).join("\n")}

Rows with status \`under_review\` stay in the dataset, with their status, so each table is complete. Filter on \`status\` = \`verified\` (and \`not_applicable\` if you want the "does not apply" rows) for checked figures only.

### National and regional tables

A national table (\`region_code\` empty) holds the figures that apply nationwide. A regional table (a state, province, canton, autonomous community or nation) holds **only** the figures that the region sets itself, for example state income tax or a regional scale; add it to the national table of the same country and tax year.

### Dates

- \`tax_year\` names the tax year; \`effective_from\` / \`effective_to\` give the period a figure applies to. Usually that is the tax year; a figure that has its own period (for example a rate in force since an earlier year, or a mid-year change) carries that period instead. An empty \`effective_to\` means in force until changed.
- \`retrieved_at\` is the day the figure was taken from \`source_url\`. \`last_verified\` (summary and JSON files) is the latest \`retrieved_at\` in a table.
- Only the current tax year has \`is_current_year\` = \`true\`. Earlier years are kept for reference where calcbloc.com still serves them.

## Summary columns (\`tables-summary.csv\`)

${colTable(SUMMARY_COLUMNS)}

## Pending countries

${ctx.pending.length ? `${pendingLine(ctx)} Pending countries have no files in this dataset; \`tables/manifest.json\` lists them under \`pending\`.` : "None: every country with a tax-table page on calcbloc.com is included."}
`;
}

// ---------------------------------------------------------------------------------------------------------------------
// dist/TABLES.md

export function tablesMd(ctx, summaries) {
  const out = [
    `# Tables and official sources`,
    ``,
    `Version ${ctx.version} · ${fmt(ctx.tables)} tables · ${fmt(ctx.rows)} rows. One entry per table file in this dataset, with its tax year, row counts, last-verified date and links; the official sources of each country follow its tables. Generated from \`tables/manifest.json\`.`,
    ``,
  ];
  for (const c of ctx.countriesByName) {
    const ts = ctx.tableList.filter((t) => t.entry === c);
    out.push(`## ${c.name}`, ``, `Currency ${c.currency} · current tax year ${c.current_year} · [tax tables on calcbloc.com](${utm(`${SITE}/${c.country}/tax-tables`, "docs")})`, ``);
    out.push(`| Table | Tax year | Rows | Under review | Status | Last verified | Page | Files |`, `|---|---|---:|---:|---|---|---|---|`);
    for (const t of ts) {
      const s = summaries.get(t);
      out.push(
        `| ${t.region ? mdCell(t.region.name) : "National"} | ${t.year} | ${fmt(s.row_count)} | ${fmt(s.under_review_rows)} | ${s.table_status} | ${s.last_verified} | [page](${utm(s.page_url, "docs")}) | [CSV](${s.csv_path}) · [JSON](${s.json_path}) |`,
      );
    }
    const titles = new Map();
    for (const t of ts) for (const r of t.data.rows) if (!titles.has(r.source_url)) titles.set(r.source_url, r.source_title);
    out.push(``, `**Official sources (${fmt(titles.size)}):**`, ``);
    for (const [url, title] of [...titles].sort((a, b) => (a[0] < b[0] ? -1 : 1))) out.push(`- [${mdCell(title).replace(/[[\]]/g, "")}](${url})`);
    out.push(``);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------------------------------------------------
// Citation and archive metadata

export const KEYWORDS = [
  "income tax",
  "tax brackets",
  "tax tables",
  "tax rates",
  "social security contributions",
  "payroll tax",
  "employer contributions",
  "personal allowance",
  "public finance",
  "open data",
];

export function citationCff(ctx) {
  const q = (s) => JSON.stringify(s);
  return `# Generated by scripts/build.mjs. Edit scripts/lib/docs.mjs, not this file.
cff-version: 1.2.0
message: ${q(`If you use this dataset, please cite it as below and credit "${CREDIT}".`)}
type: dataset
title: ${q(ctx.title)}
abstract: ${q(`Income tax brackets, allowances and social security contribution rates for ${ctx.countries} countries (${ctx.tables} national and regional tables, ${ctx.rows} rows) for the ${ctx.yearList} tax years, compiled from official government sources. Every row carries its official source URL, retrieval date and review status.`)}
authors:
  - name: "${PUBLISHER.name}"
    website: "${PUBLISHER.url}"
    email: "hello@calcbloc.com"
version: ${q(ctx.version)}
date-released: ${q(ctx.generatedAt)}
license: ${LICENCE.id}
url: "${SITE}/data"
repository-code: "${ctx.ghUrl}"
${ctx.doi ? `doi: ${q(ctx.doi)}\nidentifiers:\n  - type: doi\n    value: ${q(ctx.doi)}\n    description: "Zenodo DOI (all versions)"\n` : ""}keywords:
${KEYWORDS.map((k) => `  - ${q(k)}`).join("\n")}
`;
}

/** `link(url, text)` formats a link for the target (HTML for .zenodo.json, Markdown for zenodo/README.md). */
function zenodoParagraphs(ctx, link) {
  return [
    `Free, machine-readable income tax tables and social security contribution rates for ${ctx.countries} countries, compiled by CalcBloc (calcbloc.com) from official government sources. Each table covers one country and tax year (the ${ctx.yearList} tax years) and lists the tax brackets, personal allowances and credits, employee and employer social security contributions with their ceilings, and other payroll figures. Regional tables cover states, provinces, cantons and other regions that set their own rates.`,
    `This version contains ${fmt(ctx.tables)} tables (${fmt(ctx.nationalTables)} national, ${fmt(ctx.regionalTables)} regional) with ${fmt(ctx.rows)} rows drawn from ${fmt(ctx.sources)} official sources; the latest figure was verified on ${ctx.lastVerified}. Every row states its official source URL, the date it was retrieved and a review status (verified, under_review or not_applicable). Rates are decimal fractions (0.2 = 20%); money is in the country's currency.`,
    `Countries: ${listJoin(ctx.countryNames)}.${ctx.pending.length ? ` Pending (not included until complete): ${listJoin(ctx.pending.map((p) => p.name))}.` : ""}`,
    `Files: a combined long-format CSV and JSON of all rows, one CSV and one JSON file per table, a per-table summary with last-verified dates and source URLs, a data dictionary and a Frictionless Data Package descriptor (datapackage.json).`,
    `© ${ctx.generatedAt.slice(0, 4)} ${PUBLISHER.name}. Licence: CC BY 4.0. Credit: "${CREDIT}". ${CANONICAL_NOTE} The same tables are served by the CalcBloc API (${link(utm(`${SITE}/developers`, "listing"), `${SITE}/developers`)}), which works without a key for 50 requests a day per IP address; a free API key (${link(utm(`${SITE}/developers/keys`, "listing"), `${SITE}/developers/keys`)}) gives 5,000 a day. The tables are reference data, not tax advice.`,
    `CalcBloc is built and maintained by ${PUBLISHER.name} (${link(utm(PUBLISHER.url, "listing"), PUBLISHER.url)}), ${PUBLISHER_DESCRIPTION}.`,
  ];
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** One canonical calcbloc.com page per national table (country and tax year), in country-name order, current year first. */
export function countryPages(ctx) {
  return ctx.countriesByName.flatMap((c) =>
    ctx.tableList.filter((t) => t.entry === c && !t.region).map((t) => ({ name: c.name, year: t.data.yearLabel ?? t.year, url: t.data.pageUrl })),
  );
}

export function zenodoJson(ctx) {
  const links = [];
  const link = (url, text) => `\u0000${links.push(`<a href="${esc(url)}">${esc(text)}</a>`) - 1}\u0000`;
  const meta = {
    title: ctx.title,
    upload_type: "dataset",
    description: zenodoParagraphs(ctx, link)
      .map((p) => `<p>${esc(p).replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)])}</p>`)
      .join(""),
    creators: [{ name: PUBLISHER.name }],
    license: "cc-by-4.0",
    access_right: "open",
    version: ctx.version,
    language: "eng",
    keywords: KEYWORDS,
    notes: `Please credit: ${CREDIT}. ${CANONICAL_NOTE} CalcBloc is a product of ${PUBLISHER.name} (${PUBLISHER.url}). Generated from ${ctx.ghUrl} (tables/manifest.json, ${ctx.generatedAt}).`,
    related_identifiers: [
      { identifier: `${SITE}/data`, relation: "isDocumentedBy", resource_type: "other" },
      { identifier: `${SITE}/developers`, relation: "isDocumentedBy", resource_type: "other" },
      { identifier: ctx.ghUrl, relation: "isSupplementTo", resource_type: "dataset" },
      // The canonical page of each national table (country and tax year); regional tables are sections of these pages.
      ...countryPages(ctx).map((p) => ({ identifier: p.url, relation: "isDocumentedBy", resource_type: "other" })),
    ],
  };
  return JSON.stringify(meta, null, 2) + "\n";
}

export function zenodoReadme(ctx) {
  return `<!-- Generated by scripts/build.mjs. Edit scripts/lib/docs.mjs, not this file. -->

# Zenodo record: ${ctx.title}

The Zenodo GitHub integration reads [\`.zenodo.json\`](../.zenodo.json) when a GitHub release is published; its \`description\` is the HTML version of the text below. Use this file to review the wording, or paste it if the record is created by hand.

**Title:** ${ctx.title}
**Upload type:** Dataset · **Licence:** Creative Commons Attribution 4.0 International · **Version:** ${ctx.version} · **Creator:** ${PUBLISHER.name}

## Description

${zenodoParagraphs(ctx, (url, text) => `[${text}](${url})`).join("\n\n")}

## Keywords

${KEYWORDS.join(", ")}

## Related identifiers

- Is documented by: ${SITE}/data
- Is documented by: ${SITE}/developers
- Is supplement to: ${ctx.ghUrl}
${countryPages(ctx)
  .map((p) => `- Is documented by: ${p.url} (${p.name}, ${p.year})`)
  .join("\n")}

## How to cite

${citationText(ctx).replace(/\*/g, "")}
`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Kaggle

export function kaggleMetadata(ctx, resources) {
  const title = `Income Tax and Social Security Tables ${ctx.headlineYear}`;
  const subtitle = `Tax brackets and contribution rates for ${ctx.countries} countries, with official sources`;
  if (title.length < 6 || title.length > 50) throw new Error(`Kaggle title must be 6-50 characters: "${title}" (${title.length})`);
  if (subtitle.length < 20 || subtitle.length > 80) throw new Error(`Kaggle subtitle must be 20-80 characters: "${subtitle}" (${subtitle.length})`);
  const meta = {
    title,
    subtitle,
    id: ctx.config.kaggleId,
    licenses: [{ name: "CC-BY-4.0" }],
    keywords: ["finance", "economics", "government", "tabular", "europe", "north america"],
    collaborators: [],
    description: kaggleCard(ctx),
    resources,
  };
  return JSON.stringify(meta, null, 2) + "\n";
}

export function kaggleCard(ctx) {
  const pending = pendingLine(ctx);
  return `## About this dataset

Free, machine-readable **income tax tables** and **social security contribution rates** for ${ctx.countries} countries, compiled by [CalcBloc](${utm(SITE, "listing")}) from official government sources for the ${ctx.yearList} tax years. Each table lists the **tax brackets**, personal allowances and credits, employee and employer contributions with their ceilings, and other payroll figures. Regional tables cover states, provinces, cantons and other regions with their own rates.

Every row carries the official **source URL**, the date it was **retrieved** and a review **status**, so each figure can be traced to the government page it came from.

**${fmt(ctx.countries)} countries · ${fmt(ctx.tables)} tables (${fmt(ctx.regionalTables)} regional) · ${fmt(ctx.rows)} rows · ${fmt(ctx.sources)} official sources · last verified ${ctx.lastVerified}**

## Files

- **calcbloc-tax-tables-all.csv**: every row of every table in long format (one row per band or value).
- **calcbloc-tax-tables-all.json**: the same rows as JSON, with dataset metadata.
- **tables-summary.csv** / **tables-summary.json**: one row per table with tax year, last-verified date, row counts, official source URLs and links.
- **DATA_DICTIONARY.md**: every column, unit and status value.

Per-table CSV and JSON files and a Frictionless \`datapackage.json\` are in the GitHub repository: ${ctx.ghUrl}

## Key columns

- \`country\`, \`region_code\`, \`tax_year\`, \`currency\`: which table the row belongs to (an empty \`region_code\` is the national table).
- \`section_id\`, \`group\` (income-tax, employee, employer, other), \`label\`: what the row is.
- \`from\`, \`to\`, \`rate\`: tax brackets; \`rate\` is a decimal fraction (0.2 = 20%) and an empty \`to\` means no upper limit.
- \`value\`, \`unit\` (rate, money, number, text): single values such as allowances, ceilings and contribution rates.
- \`source_url\`, \`source_title\`, \`retrieved_at\`, \`status\`: provenance and review status.

## Countries

| Country | Tax year(s) | Regions | Last checked | calcbloc.com |
|---|---|---:|---|---|
${ctx.countriesByName.map((c) => `| [${c.name}](${utm(c.pageUrl, "listing")}) | ${c.years.join(", ")} | ${c.regions.length ? fmt(c.regions.length) : "–"} | ${c.lastVerified ?? ""} | [${c.current_year} tables](${utm(c.pageUrl, "listing")}) |`).join("\n")}
${pending ? `\n${pending}\n` : ""}
## Status values

${STATUS_VALUES.map(([v, d]) => `- \`${v}\`: ${d}`).join("\n")}

## Ideas for use

- Compare top marginal income tax rates or employer social security costs across countries.
- Build a take-home pay or payroll cost model from the brackets and contribution rates.
- Track how tax brackets and thresholds change from one tax year to the next.

## Licence and credit

© ${ctx.generatedAt.slice(0, 4)} ${PUBLISHER.name}, licensed under [CC BY 4.0](${LICENCE.url}). Please credit **"${CREDIT}"** with a link to [${SITE}/data](${utm(`${SITE}/data`, "listing")}) or to the table's country page (the \`page_url\` column). ${CANONICAL_NOTE} The figures are reference data, not tax advice; check the official source before relying on them.

The same tables are available from the free CalcBloc API: [${SITE}/developers](${utm(`${SITE}/developers`, "listing")}). It works without a key for 50 requests a day (5 a minute) per IP address; a [free API key](${utm(`${SITE}/developers/keys`, "listing")}) gives 5,000 a day, sent in the \`X-API-Key\` header.

Version ${ctx.version}. Updated from the calcbloc.com code base with every data update; see ${ctx.ghUrl} for the change history.

## About

[CalcBloc](${utm(SITE, "listing")}) is built and maintained by [${PUBLISHER.name}](${utm(PUBLISHER.url, "listing")}), ${PUBLISHER_DESCRIPTION}.
`;
}

export function kaggleReadme(ctx) {
  return `<!-- Generated by scripts/build.mjs. This is the Kaggle dataset card; the same text is the "description" in dataset-metadata.json. -->

# ${`Income Tax and Social Security Tables ${ctx.headlineYear}`}

${kaggleCard(ctx)}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Listings and repository metadata

export function publicApisListing(ctx) {
  const description = `Official income tax brackets and social security rates for ${ctx.countries} countries, plus take-home pay`;
  if (description.length > 100) throw new Error(`public-apis description is over 100 characters (${description.length})`);
  const row = `| [CalcBloc](${utm(`${SITE}/developers`, "listing")}) | ${description} | \`apiKey\` | Yes | Yes | |`;
  return `<!-- Generated by scripts/build.mjs. Edit scripts/lib/docs.mjs, not this file. -->

# public-apis listing

Entry for [public-apis/public-apis](https://github.com/public-apis/public-apis), section **Finance**. Format and rules from the repository's CONTRIBUTING.md (checked 2026-11-11): columns API, Description, Auth, HTTPS, CORS and an optional "Call this API" (Postman) column left empty; description at most 100 characters (this one: ${description.length}); alphabetical order within the section; one link per pull request.

## Row

\`\`\`markdown
${row}
\`\`\`

Place it in \`README.md\` under \`### Finance\`, in alphabetical order (as of 2026-11-11: after **BriefTape**, before **CardBinCheck**).

- **Pull request title:** \`Add CalcBloc API\`
- **Commit message:** \`Add CalcBloc API to Finance\`
- Squash to a single commit and target the \`master\` branch.

## Why these values

- **Auth \`apiKey\`:** the API takes a free key in the \`X-API-Key\` header (OpenAPI \`security: ApiKeyHeader\`), which allows 5,000 requests a day and 60 a minute. Every endpoint also works without a key, at 50 requests a day and 5 a minute per IP address; when that allowance runs out the API answers 429 \`rate_limited\` and the CalcBloc integrations ask for a free key. The list has no value for an optional key, so \`apiKey\` stays.
- **HTTPS \`Yes\`:** served only over HTTPS at ${SITE}/api/v1.
- **CORS \`Yes\`:** every response, including errors and the OPTIONS preflight, sends \`Access-Control-Allow-Origin: *\` with \`GET, OPTIONS\` and the \`X-API-Key\` header allowed (calcbloc site code: \`src/lib/api/response.ts\`, \`baseHeaders()\`; confirmed on a live response 2026-11-11).
- **Link:** ${SITE}/developers (the API documentation page).
`;
}

export function rapidApiListing(ctx) {
  return `<!-- Generated by scripts/build.mjs. Edit scripts/lib/docs.mjs, not this file. -->

# RapidAPI listing

Copy for the RapidAPI Hub provider listing of the CalcBloc API. Read the gateway note in PUBLISHING_CHECKLIST.md (section 5) before going live: the API's own keys and per-IP limits need a decision for RapidAPI traffic.

## Name

CalcBloc Tax Tables and Take-Home Pay

## Short description

Official income tax brackets and social security rates for ${ctx.countries} countries, plus net pay and employer cost.

## Long description

The CalcBloc API returns **official tax tables** and **payroll calculations** from the same data and engines as calcbloc.com.

- **Tax tables** for ${ctx.countries} countries (${ctx.yearList} tax years): income tax brackets, personal allowances and credits, employee and employer social security contribution rates with their ceilings, and other payroll figures, with regional tables for states, provinces and cantons. Every row includes its official source URL, retrieval date and review status. JSON or CSV.
- **Take-home pay** (\`/net-salary\`): net pay from a gross salary, with income tax, social security and the main country-specific options.
- **Employer cost** (\`/employer-cost\`): the total cost of employing someone, with employer contributions and payroll taxes.
- **Compare** (\`/compare\`): the same salary in two countries.
- **Countries** (\`/countries\`): supported countries, regions, tax years and parameters.

Rates are decimals (0.2 = 20%), amounts are in the country's currency, and every response includes an attribution block. Free use requires a visible "Data by CalcBloc" link to calcbloc.com wherever the figures are shown (terms: ${utm(`${SITE}/developers/terms`, "listing")}).

## Category

Finance (secondary tags: Data, Tax, Payroll)

## Base URL

\`${SITE}/api/v1\` when the endpoints are entered by hand (paths as below). When the OpenAPI document is imported, use \`${SITE}\`: its paths already start with \`/api/v1\`.

## Endpoints

| Method | Path | What it returns | Key |
|---|---|---|---|
| GET | \`/countries\` | Supported countries, regions, years and parameters | Optional |
| GET | \`/tax-tables/{country}/{year}\` | Official tax tables for a country and tax year; \`region\` and \`format=json\\|csv\` optional; \`year\` may be \`latest\` | Optional |
| GET | \`/net-salary?country=&salary=\` | Take-home pay for a salary | Optional |
| GET | \`/employer-cost?country=&salary=\` | Total cost of employing someone | Optional |
| GET | \`/compare?a=&b=&salary=\` | The same salary in two countries | Optional |

Authentication: \`X-API-Key\` header (keys in the URL are refused). Used directly, every endpoint works without a key for 50 requests a day and 5 a minute per IP address; a free key from calcbloc.com allows 5,000 a day and 60 a minute. When the allowance without a key runs out the API answers 429 \`rate_limited\` with \`Retry-After\`. The calculation endpoints cover fewer countries than the tax tables; \`/countries\` lists them.

## OpenAPI

${SITE}/api/openapi.json (OpenAPI 3.1; RapidAPI Studio can import it. The path \`/api/v1/openapi.json\` redirects there.)

## Pricing note

Suggested: a free BASIC plan only, mirroring the direct free tier (5,000 requests a day, 60 a minute), with attribution required. Paid plans only once commercial terms (higher volumes, no attribution) are set; until then point commercial users to hello@calcbloc.com. Check RapidAPI's current marketplace fee before pricing a paid plan.

## Links

- Documentation: ${utm(`${SITE}/developers`, "listing")}
- Terms: ${utm(`${SITE}/developers/terms`, "listing")}
- Free key (direct use): ${utm(`${SITE}/developers/keys`, "listing")}
- Open data (CSV/JSON, CC BY 4.0): ${ctx.ghUrl}
- Logo: ${SITE}/icon-512.png
`;
}

export function repoMetadata(ctx) {
  const description = `Income tax brackets and social security contribution rates for ${ctx.countries} countries (${ctx.yearList}), from official sources. CSV and JSON, CC BY 4.0. Data by CalcBloc.`;
  return `<!-- Generated by scripts/build.mjs. Edit scripts/lib/docs.mjs, not this file. -->

# Repository metadata (for the GitHub settings)

**Description** (${description.length} characters; GitHub allows 350):

\`\`\`text
${description}
\`\`\`

**Website:** \`${SITE}/data\`

**Topics** (GitHub allows 20):

\`\`\`text
tax-tables income-tax tax-brackets tax-rates social-security payroll payroll-tax open-data dataset csv json frictionless-data public-finance government-data salary finance economics cc-by
\`\`\`

**Features:** Issues on (for corrections); Wiki and Projects off; Discussions optional.

**Social preview image:** a 1280×640 card with "CalcBloc Tax Tables — ${ctx.countries} countries, ${ctx.headlineYear}" (Settings → General → Social preview).

**Releases:** tag \`v${ctx.version}\` (CalVer from the export date in \`tables/manifest.json\`); release title "CalcBloc Tax Tables ${ctx.version}"; body: countries, tables and rows from the README "At a glance" line. Each release is archived by Zenodo once the integration is on.
`;
}
