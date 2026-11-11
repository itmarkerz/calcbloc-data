# Data dictionary: CalcBloc Tax Tables

Version 2026.11.11 · 29 countries · 213 tables · 7,329 rows · CC BY 4.0 · Data by CalcBloc (calcbloc.com/data)

This file describes the columns of every CSV and JSON file in `dist/`. It is generated from the same column list as `datapackage.json`.

## Files

- `calcbloc-tax-tables-all.csv`: all rows of all tables (long format, one row per band or value).
- `calcbloc-tax-tables-all.json`: the same rows as a JSON array (`rows`), with dataset metadata.
- `csv/<country>/<tax_year>.csv` and `csv/<country>/<tax_year>/<region_code>.csv`: one table per file, same columns.
- `json/...`: one table per file: table metadata (tax year, effective dates, `table_status`, `last_verified`, `sources`, `page_url`, `api_url`, licence and credit) and its `rows`.
- `tables-summary.csv` / `tables-summary.json`: one row per table (columns below).
- `TABLES.md`: a readable version of the summary with the official sources per country.

CSV files are UTF-8 without a byte-order mark, comma-separated, with a header row, CRLF line endings and RFC 4180 quoting. In CSV an empty cell means no value (`null` in JSON). Booleans are `true` / `false`. Dates are ISO 8601 (`YYYY-MM-DD`).

## Row columns

| Column | Type | Description | Example |
|---|---|---|---|
| `country` | string, required | Country code as used in calcbloc.com URLs and the API (lowercase, hyphenated English name or common short form, e.g. us, uk, uae, new-zealand). | `new-zealand` |
| `country_name` | string, required | Country name in English. | `New Zealand` |
| `region_code` | string | Region code (state, province, canton, autonomous community, nation...) for regional tables; empty for national tables. Same code as the API's region parameter. | `ca` |
| `region_name` | string | Region name; empty for national tables. | `California` |
| `currency` | string, required | ISO 4217 currency code of every money amount in the table (value where unit is money, and the from/to band limits). | `EUR` |
| `tax_year` | string, required | Tax year of the table: 2026 for a calendar tax year, 2026-27 for a split year (e.g. UK 6 April 2026 to 5 April 2027). | `2026-27` |
| `is_current_year` | boolean, required | true for the country's current tax year; false for an earlier year kept for reference. | `true` |
| `section_id` | string, required | Stable identifier of the table section the row belongs to (also the anchor on the calcbloc.com page). | `income-tax-england` |
| `section` | string, required | Section title. | `Income Tax bands: England and Northern Ireland` |
| `group` | string, required | What the section covers: income-tax, employee, employer or other (see Groups). | `income-tax` |
| `label` | string | Name of the band or value. | `Higher rate` |
| `from` | number | Bands only: lower limit of the band, in the table's currency (on the basis described in basis). Empty for value rows. | `37700` |
| `to` | number | Bands only: upper limit of the band; empty means no upper limit (the top band). Empty for value rows. | `125140` |
| `rate` | number | Rate as a decimal fraction (0.4 = 40%): the marginal rate of a band, or the value of a rate row. Empty for money, number and text rows. | `0.4` |
| `value` | any | The value of a money, number or text row (see unit). Empty for bands and rate rows. Numbers are written without thousands separators. | `12570` |
| `unit` | string, required | How to read the row: rate (see the rate column), money, number or text (see the value column). | `rate` |
| `basis` | string | What the band limits or the rate apply to, and the period (per year, per month, per week). Empty when it is obvious from the label. | `Taxable income above the Personal Allowance, per year` |
| `note` | string | Qualifications or conditions for the row or its section. Often empty. | *(empty)* |
| `effective_from` | date, required | First day the figure applies (ISO 8601 date). | `2026-04-06` |
| `effective_to` | date | Last day the figure applies; empty means in force until changed. | `2027-04-05` |
| `status` | string, required | Review status: verified, under_review or not_applicable (see Status values). | `verified` |
| `source_title` | string, required | Title of the official source (government, tax authority or social security agency publication, or the law). | `HMRC: Income Tax rates and allowances for current and previous tax years` |
| `source_url` | string (uri), required | URL of the official source the figure was taken from. | `https://www.gov.uk/government/publications/rates-and-allowances-income-tax` |
| `retrieved_at` | date, required | Date the figure was retrieved from (and checked against) source_url (ISO 8601 date). | `2026-10-16` |
| `page_url` | string (uri), required | The calcbloc.com page that shows this table; link here when you credit the data. | `https://calcbloc.com/uk/tax-tables/2026-27` |

## How to read a row

- **Bands** (`unit` = `rate`, `from` filled): a marginal rate. `rate` applies to the slice of the amount described in `basis` from `from` up to `to`; an empty `to` means no upper limit. Bands of one `section_id` together form a scale; tax on an amount is the sum over the slices.
- **Rate values** (`unit` = `rate`, `from` empty): a single rate, for example a contribution rate. Read it from `rate`.
- **Money, number and text values**: read `value`. Money is in the table's `currency`; `basis` and `label` say whether it is per year, month or week.

### How rates are expressed

All rates are decimal fractions between 0 and 1: `0.2` = 20%, `0.0765` = 7.65%, `0.00125` = 0.125%. Multiply by 100 for a percentage. Rates are never written as percentages, per-mille values or text, except inside a `text` row that describes a rule in words.

### Units

- `rate`: A rate, in the rate column, as a decimal fraction: 0.2 means 20%, 0.0765 means 7.65%. value is empty.
- `money`: An amount of money in the table's currency (currency column), in value. Rates are never stored as money.
- `number`: A plain number that is not money or a rate, in value: a count, an age, a number of years or days, a multiplier.
- `text`: A short statement in value, for rules that are not a single figure (for example a phase-out description or "None").

### Groups

- `income-tax`: Income tax: brackets, allowances, credits, surtaxes and related rules.
- `employee`: Contributions and levies paid by the employee (social security, pension, health, unemployment, payroll levies).
- `employer`: Contributions and payroll taxes paid by the employer on top of gross pay.
- `other`: Other figures shown on the country's tax-table page (for example VAT, corporation tax, minimum wage or self-employment rules).

### Status values

- `verified`: The figure was checked against the official source given in source_url on the retrieved_at date.
- `under_review`: The row belongs to a section that is flagged for manual re-verification: a figure in it rests on a copy of the official page rather than the page itself, a later re-check could not reproduce it, or the underlying record is not yet marked verified. The whole section is flagged, so most rows in it are usually correct. Confirm the figure against source_url before relying on it; calcbloc.com marks the same sections as under review.
- `not_applicable`: A sourced "does not apply" row: the source confirms that the item does not exist in that jurisdiction (for example a state with no labour welfare fund, or a country with no statutory minimum wage). value then holds a short explanation.

Rows with status `under_review` stay in the dataset, with their status, so each table is complete. Filter on `status` = `verified` (and `not_applicable` if you want the "does not apply" rows) for checked figures only.

### National and regional tables

A national table (`region_code` empty) holds the figures that apply nationwide. A regional table (a state, province, canton, autonomous community or nation) holds **only** the figures that the region sets itself, for example state income tax or a regional scale; add it to the national table of the same country and tax year.

### Dates

- `tax_year` names the tax year; `effective_from` / `effective_to` give the period a figure applies to. Usually that is the tax year; a figure that has its own period (for example a rate in force since an earlier year, or a mid-year change) carries that period instead. An empty `effective_to` means in force until changed.
- `retrieved_at` is the day the figure was taken from `source_url`. `last_verified` (summary and JSON files) is the latest `retrieved_at` in a table.
- Only the current tax year has `is_current_year` = `true`. Earlier years are kept for reference where calcbloc.com still serves them.

## Summary columns (`tables-summary.csv`)

| Column | Type | Description | Example |
|---|---|---|---|
| `country` | string, required | Country code (as in the rows). |  |
| `country_name` | string, required | Country name in English. |  |
| `region_code` | string | Region code; empty for the national table. |  |
| `region_name` | string | Region name; empty for the national table. |  |
| `tax_year` | string, required | Tax year (2026 or 2026-27). |  |
| `year_label` | string, required | Tax year as written on calcbloc.com (2026 or 2026/27). |  |
| `is_current_year` | boolean, required | true for the current tax year. |  |
| `currency` | string, required | ISO 4217 currency code. |  |
| `effective_from` | date, required | First day of the tax year. |  |
| `effective_to` | date | Last day of the tax year. |  |
| `table_status` | string, required | Status of the table as a whole, as shown on calcbloc.com: verified when its sources and every section are verified; unverified when any section is under review (see under_review_rows). |  |
| `row_count` | integer, required | Number of rows in the table. |  |
| `under_review_rows` | integer, required | Rows with status under_review. |  |
| `not_applicable_rows` | integer, required | Rows with status not_applicable. |  |
| `last_verified` | date, required | Latest retrieved_at date of any row in the table. |  |
| `source_count` | integer, required | Number of distinct official source URLs. |  |
| `source_urls` | string, required | The distinct official source URLs, separated by a space. |  |
| `page_url` | string (uri), required | calcbloc.com page for the table. |  |
| `api_url` | string (uri), required | The same table from the CalcBloc API (JSON; add format=csv for CSV). |  |
| `csv_path` | string, required | Path of the table's CSV file in this dataset. |  |
| `json_path` | string, required | Path of the table's JSON file in this dataset. |  |

## Pending countries

Belgium is not included yet: held until the 2026 federal income-tax scale is confirmed against the official FPS Finance publication. It will be added as soon as its tables are complete. Pending countries have no files in this dataset; `tables/manifest.json` lists them under `pending`.
