/**
 * Column definitions for every CSV and JSON file in dist/. One list drives the files, the Frictionless
 * Table Schema (datapackage.json), the Kaggle column descriptions and DATA_DICTIONARY.md, so they cannot drift.
 */

export const STATUS_VALUES = [
  ["verified", "The figure was checked against the official source given in source_url on the retrieved_at date."],
  [
    "under_review",
    "The row belongs to a section that is flagged for manual re-verification: a figure in it rests on a copy of the official page rather than the page itself, a later re-check could not reproduce it, or the underlying record is not yet marked verified. The whole section is flagged, so most rows in it are usually correct. Confirm the figure against source_url before relying on it; calcbloc.com marks the same sections as under review.",
  ],
  [
    "not_applicable",
    'A sourced "does not apply" row: the source confirms that the item does not exist in that jurisdiction (for example a state with no labour welfare fund, or a country with no statutory minimum wage). value then holds a short explanation.',
  ],
];

export const UNIT_VALUES = [
  ["rate", "A rate, in the rate column, as a decimal fraction: 0.2 means 20%, 0.0765 means 7.65%. value is empty."],
  ["money", "An amount of money in the table's currency (currency column), in value. Rates are never stored as money."],
  ["number", "A plain number that is not money or a rate, in value: a count, an age, a number of years or days, a multiplier."],
  ["text", "A short statement in value, for rules that are not a single figure (for example a phase-out description or \"None\")."],
];

export const GROUP_VALUES = [
  ["income-tax", "Income tax: brackets, allowances, credits, surtaxes and related rules."],
  ["employee", "Contributions and levies paid by the employee (social security, pension, health, unemployment, payroll levies)."],
  ["employer", "Contributions and payroll taxes paid by the employer on top of gross pay."],
  ["other", "Other figures shown on the country's tax-table page (for example VAT, corporation tax, minimum wage or self-employment rules)."],
];

/**
 * The row columns, in file order. `type` is a Frictionless Table Schema type; `kaggle` the Kaggle column type.
 */
export const ROW_COLUMNS = [
  { name: "country", type: "string", kaggle: "string", required: true, example: "new-zealand", description: "Country code as used in calcbloc.com URLs and the API (lowercase, hyphenated English name or common short form, e.g. us, uk, uae, new-zealand)." },
  { name: "country_name", type: "string", kaggle: "country", required: true, example: "New Zealand", description: "Country name in English." },
  { name: "region_code", type: "string", kaggle: "string", example: "ca", description: "Region code (state, province, canton, autonomous community, nation...) for regional tables; empty for national tables. Same code as the API's region parameter." },
  { name: "region_name", type: "string", kaggle: "province", example: "California", description: "Region name; empty for national tables." },
  { name: "currency", type: "string", kaggle: "string", required: true, example: "EUR", description: "ISO 4217 currency code of every money amount in the table (value where unit is money, and the from/to band limits)." },
  { name: "tax_year", type: "string", kaggle: "string", required: true, example: "2026-27", description: "Tax year of the table: 2026 for a calendar tax year, 2026-27 for a split year (e.g. UK 6 April 2026 to 5 April 2027)." },
  { name: "is_current_year", type: "boolean", kaggle: "boolean", required: true, example: "true", description: "true for the country's current tax year; false for an earlier year kept for reference." },
  { name: "section_id", type: "string", kaggle: "string", required: true, example: "income-tax-england", description: "Stable identifier of the table section the row belongs to (also the anchor on the calcbloc.com page)." },
  { name: "section", type: "string", kaggle: "string", required: true, example: "Income Tax bands: England and Northern Ireland", description: "Section title." },
  { name: "group", type: "string", kaggle: "string", required: true, example: "income-tax", enum: GROUP_VALUES.map(([v]) => v), description: "What the section covers: income-tax, employee, employer or other (see Groups)." },
  { name: "label", type: "string", kaggle: "string", example: "Higher rate", description: "Name of the band or value." },
  { name: "from", type: "number", kaggle: "numeric", example: "37700", description: "Bands only: lower limit of the band, in the table's currency (on the basis described in basis). Empty for value rows." },
  { name: "to", type: "number", kaggle: "numeric", example: "125140", description: "Bands only: upper limit of the band; empty means no upper limit (the top band). Empty for value rows." },
  { name: "rate", type: "number", kaggle: "numeric", example: "0.4", minimum: 0, maximum: 5, description: "Rate as a decimal fraction (0.4 = 40%): the marginal rate of a band, or the value of a rate row. A few rows are a multiple of another amount and exceed 1, for example a Liechtenstein municipal surcharge of 1.5 = 150% of the national income tax. Empty for money, number and text rows." },
  { name: "value", type: "any", kaggle: "string", example: "12570", description: "The value of a money, number or text row (see unit). Empty for bands and rate rows. Numbers are written without thousands separators." },
  { name: "unit", type: "string", kaggle: "string", required: true, example: "rate", enum: UNIT_VALUES.map(([v]) => v), description: "How to read the row: rate (see the rate column), money, number or text (see the value column)." },
  { name: "basis", type: "string", kaggle: "string", example: "Taxable income above the Personal Allowance, per year", description: "What the band limits or the rate apply to, and the period (per year, per month, per week). Empty when it is obvious from the label." },
  { name: "note", type: "string", kaggle: "string", example: "", description: "Qualifications or conditions for the row or its section. Often empty." },
  { name: "effective_from", type: "date", kaggle: "datetime", required: true, example: "2026-04-06", description: "First day the figure applies (ISO 8601 date)." },
  { name: "effective_to", type: "date", kaggle: "datetime", example: "2027-04-05", description: "Last day the figure applies; empty means in force until changed." },
  { name: "status", type: "string", kaggle: "string", required: true, example: "verified", enum: STATUS_VALUES.map(([v]) => v), description: "Review status: verified, under_review or not_applicable (see Status values)." },
  { name: "source_title", type: "string", kaggle: "string", required: true, example: "HMRC: Income Tax rates and allowances for current and previous tax years", description: "Title of the official source (government, tax authority or social security agency publication, or the law)." },
  { name: "source_url", type: "string", format: "uri", kaggle: "url", required: true, example: "https://www.gov.uk/government/publications/rates-and-allowances-income-tax", description: "URL of the official source the figure was taken from." },
  { name: "retrieved_at", type: "date", kaggle: "datetime", required: true, example: "2026-10-16", description: "Date the figure was retrieved from (and checked against) source_url (ISO 8601 date)." },
  { name: "page_url", type: "string", format: "uri", kaggle: "url", required: true, example: "https://calcbloc.com/uk/tax-tables/2026-27", description: "The calcbloc.com page that shows this table; link here when you credit the data." },
];

/** Columns of dist/tables-summary.csv: one row per table file. */
export const SUMMARY_COLUMNS = [
  { name: "country", type: "string", kaggle: "string", required: true, description: "Country code (as in the rows)." },
  { name: "country_name", type: "string", kaggle: "country", required: true, description: "Country name in English." },
  { name: "region_code", type: "string", kaggle: "string", description: "Region code; empty for the national table." },
  { name: "region_name", type: "string", kaggle: "province", description: "Region name; empty for the national table." },
  { name: "tax_year", type: "string", kaggle: "string", required: true, description: "Tax year (2026 or 2026-27)." },
  { name: "year_label", type: "string", kaggle: "string", required: true, description: "Tax year as written on calcbloc.com (2026 or 2026/27)." },
  { name: "is_current_year", type: "boolean", kaggle: "boolean", required: true, description: "true for the current tax year." },
  { name: "currency", type: "string", kaggle: "string", required: true, description: "ISO 4217 currency code." },
  { name: "effective_from", type: "date", kaggle: "datetime", required: true, description: "First day of the tax year." },
  { name: "effective_to", type: "date", kaggle: "datetime", description: "Last day of the tax year." },
  { name: "table_status", type: "string", kaggle: "string", required: true, enum: ["verified", "unverified"], description: "Status of the table as a whole, as shown on calcbloc.com: verified when its sources and every section are verified; unverified when any section is under review (see under_review_rows)." },
  { name: "row_count", type: "integer", kaggle: "integer", required: true, description: "Number of rows in the table." },
  { name: "under_review_rows", type: "integer", kaggle: "integer", required: true, description: "Rows with status under_review." },
  { name: "not_applicable_rows", type: "integer", kaggle: "integer", required: true, description: "Rows with status not_applicable." },
  { name: "last_verified", type: "date", kaggle: "datetime", required: true, description: "Latest retrieved_at date of any row in the table." },
  { name: "source_count", type: "integer", kaggle: "integer", required: true, description: "Number of distinct official source URLs." },
  { name: "source_urls", type: "string", kaggle: "string", required: true, description: "The distinct official source URLs, separated by a space." },
  { name: "page_url", type: "string", format: "uri", kaggle: "url", required: true, description: "calcbloc.com page for the table." },
  { name: "api_url", type: "string", format: "uri", kaggle: "url", required: true, description: "The same table from the CalcBloc API (JSON; add format=csv for CSV)." },
  { name: "csv_path", type: "string", kaggle: "string", required: true, description: "Path of the table's CSV file in this dataset." },
  { name: "json_path", type: "string", kaggle: "string", required: true, description: "Path of the table's JSON file in this dataset." },
];

/** A Frictionless Table Schema for a column list. */
export function tableSchema(columns, extra = {}) {
  return {
    fields: columns.map((c) => {
      const f = { name: c.name, type: c.type, description: c.description };
      if (c.format) f.format = c.format;
      const constraints = {};
      if (c.required) constraints.required = true;
      if (c.enum) constraints.enum = c.enum;
      if (c.minimum !== undefined) constraints.minimum = c.minimum;
      if (c.maximum !== undefined) constraints.maximum = c.maximum;
      if (Object.keys(constraints).length) f.constraints = constraints;
      return f;
    }),
    missingValues: [""],
    ...extra,
  };
}

/** Kaggle dataset-metadata.json column schema. */
export function kaggleSchema(columns) {
  return { fields: columns.map((c) => ({ name: c.name, description: c.description, type: c.kaggle })) };
}
