# Publishing checklist

Manual steps to publish each CalcBloc data item, in order, with what to check afterwards. Nothing in this repository publishes anything by itself. Counts, years and titles in the generated files come from `tables/manifest.json`, so always start from a fresh sync.

Accounts used: the GitHub organization `itmarkerz` (repositories `calcbloc-data`, `calcbloc-python`, `calcbloc-js`, `calcbloc-php`), Zenodo (sign in with GitHub), Kaggle, RapidAPI provider, PyPI, npm, Packagist. Contact address in all listings: hello@calcbloc.com.

## 0. Before every release

1. Check out the **deployed** branch of the site (`main` of `calcbloc`, the commit that is live on calcbloc.com).
2. In this repository: `npm run sync -- ../calcbloc` (or set `CALCBLOC_SITE_DIR`). The script warns if the site checkout is not on `main`.
3. `npm run build`, then `npm test` (all tests must pass; they also fail if `dist/` or a generated document is stale).
4. Read the diff: `git status`, `git diff --stat`. Countries added or removed should match what is live; every country page linked in the README must open (spot-check the newest ones).
5. Commit with explicit paths (`git add tables dist README.md CITATION.cff .zenodo.json kaggle zenodo listings .github`), never `git add -A`.

**Verify:** `npm test` green; the README H1 country count equals the number of tax-table countries on calcbloc.com/data; no pending country appears in `dist/`.

## 1. GitHub repository (`itmarkerz/calcbloc-data`)

1. Create the public repository in the `itmarkerz` organization without a README or licence (this repository has both) and push `main`.
2. Settings → General: set **Description** and **Website** from [.github/REPO_METADATA.md](.github/REPO_METADATA.md); add the **Topics** listed there (About panel → gear icon).
3. Settings → General → Features: Issues on; Wiki and Projects off; Discussions optional.
4. Settings → General → Social preview: upload a 1280×640 image (suggested text in REPO_METADATA.md).
5. Optional: Settings → Branches → protect `main` (require pull requests) once others contribute.

**Verify:** the README renders with the coverage table and working links (click a CSV and a JSON link in `dist/`, and a calcbloc.com page link); the sidebar shows the CC BY 4.0 licence (GitHub may list MIT from LICENSE-CODE next to it, which is intended); "Cite this repository" appears in the sidebar (from CITATION.cff); no file is over GitHub's 50 MB warning size (the largest, `dist/calcbloc-tax-tables-all.json`, is about 7 MB).

## 2. Zenodo DOI (GitHub integration)

1. Sign in at https://zenodo.org with a GitHub account that is an owner of the `itmarkerz` organization. Organization repositories only appear if the Zenodo OAuth app has access to the organization: grant it on the GitHub authorization screen, or approve it under the organization's Settings → Third-party access (OAuth application policy).
2. Open https://zenodo.org/account/settings/github/, press **Sync now**, and flip the switch **on** for `itmarkerz/calcbloc-data`. Only releases created *after* this step are archived.
3. On GitHub, create a release: tag `v<version>` (the `version` in `.zenodo.json`, e.g. `v2026.11.11`), title "CalcBloc Tax Tables <version>", body from the README "At a glance" line.
4. Wait a few minutes; the release appears on the Zenodo GitHub page with a DOI. Copy the **concept DOI** (the one that "represents all versions", e.g. `10.5281/zenodo.1234567`).
5. Put it in `package.json` → `calcblocData.doi`, run `npm run build && npm test`, and commit: the README gains the DOI badge and citation, CITATION.cff gains the `doi` field.
6. Optional: on the Zenodo record, add the owner as an additional creator (with ORCID) if the dataset should credit a person as well as itmarkerz technologies; to make it permanent, add that creator to `zenodoJson()` in `scripts/lib/docs.mjs`.

**Verify:** the Zenodo record shows resource type **Dataset**, licence **Creative Commons Attribution 4.0 International**, the title and description from `.zenodo.json` (Zenodo uses `.zenodo.json` in preference to CITATION.cff), version, keywords and related identifiers; https://doi.org/<DOI> resolves; the DOI badge in the README links to the record. Later releases must create new versions under the same concept DOI.

## 3. Kaggle dataset

1. Kaggle account → Settings → API → **Create New Token**; save `kaggle.json` to `~/.kaggle/` (Windows: `C:\Users\<you>\.kaggle\`), or set `KAGGLE_USERNAME` and `KAGGLE_KEY`. Never commit it (it is in `.gitignore`).
2. `pip install kaggle`.
3. **Confirmed:** the Kaggle id is `itmarkerz/calcbloc-tax-tables` (Kaggle username `itmarkerz`; Kaggle datasets belong to a user, not to the GitHub organization). If the account ever changes, change `calcblocData.kaggleId` in `package.json` and run `npm run build`.
4. `npm run stage:kaggle` (copies `kaggle/dataset-metadata.json` and the five top-level dist files into `build/kaggle/`).
5. First upload: `kaggle datasets create -p build/kaggle --public` (omit `--public` to review it privately first, then switch visibility in the dataset settings).
6. Later updates: `npm run stage:kaggle && kaggle datasets version -p build/kaggle -m "Update <version>"`.
7. In the Kaggle UI: add a cover image, check the tags (Kaggle only keeps tags that exist on Kaggle; the metadata asks for finance, economics, government, tabular, europe, north america), and set "Expected update frequency" to quarterly or annually.

**Verify:** the dataset page shows the card from [kaggle/README.md](kaggle/README.md), licence **CC BY 4.0** (if Kaggle rejected the licence name `CC-BY-4.0`, pick "CC BY 4.0" in Settings), five files, column descriptions in the Data Explorer for both CSV files; the usability score is 8 or more (add a cover image and provenance text if it is lower).

## 4. public-apis pull request

The **Auth** value stays `apiKey` in [listings/public-apis.md](listings/public-apis.md). Key policy (decided 11 November 2026): every endpoint works without a key for 50 requests a day and 5 a minute per IP address; when that runs out the API answers 429 and the CalcBloc integrations and packages ask for a free API key (5,000 a day, 60 a minute) from https://calcbloc.com/developers/keys, sent in the `X-API-Key` header.

1. Fork https://github.com/public-apis/public-apis and create a branch.
2. In `README.md`, section `### Finance`, insert the row from [listings/public-apis.md](listings/public-apis.md) in alphabetical order (currently after BriefTape, before CardBinCheck).
3. Commit message `Add CalcBloc API to Finance`; squash to one commit; open the pull request against `master` with the title `Add CalcBloc API`; fill in the PR template checklist.
4. Wait for the link-check build; fix and squash again if it fails.

**Verify:** the PR has one commit changing one line; the link check passes; https://calcbloc.com/developers answers 200 and `curl -I https://calcbloc.com/api/v1/tax-tables/uk/2026-27` shows `access-control-allow-origin: *`.

## 5. RapidAPI listing

**Decide before going live (server-side work may be needed):** RapidAPI forwards every request from its own servers, so all RapidAPI users would share the API's per-IP allowance without a key (50 requests a day) and could not add their own free CalcBloc key through the gateway. Options: (a) if RapidAPI's gateway settings allow a fixed extra request header, send `X-API-Key` with a dedicated key on a raised tier; or (b) change the API to recognise RapidAPI traffic by the `X-RapidAPI-Proxy-Secret` header and rate-limit per `X-RapidAPI-User`. Either way, the API's attribution requirement applies to RapidAPI users too (the response carries the attribution block).

1. Sign in at https://rapidapi.com/provider (RapidAPI Studio) → **Add API Project**; name, short description and category (Finance) from [listings/rapidapi.md](listings/rapidapi.md).
2. Definition: import the OpenAPI document from https://calcbloc.com/api/openapi.json, or add the endpoints by hand.
3. Base URL: `https://calcbloc.com` when importing the OpenAPI document (its paths start with `/api/v1`); `https://calcbloc.com/api/v1` when entering paths by hand.
4. Gateway / security: copy the **X-RapidAPI-Proxy-Secret** value and store it on the server if option (b) is chosen; configure the header for option (a).
5. Hub listing: long description, logo (https://calcbloc.com/icon-512.png), website https://calcbloc.com/developers?utm_source=calcbloc-data&utm_medium=listing&utm_campaign=itmarkerz-oss, terms https://calcbloc.com/developers/terms?utm_source=calcbloc-data&utm_medium=listing&utm_campaign=itmarkerz-oss.
6. Monetize: create a free **BASIC** plan with a hard daily limit no higher than what the server allows for RapidAPI traffic. Add paid plans only once commercial terms exist.
7. Make the API public.

**Verify:** a test call from the RapidAPI console to `/tax-tables/{country}/{year}` and to `/net-salary` returns 200 with the attribution block; two different RapidAPI test users do not exhaust each other's limit; the listing links resolve.

## 6. PyPI: `calcbloc` (repository `itmarkerz/calcbloc-python`)

The name `calcbloc` was free on PyPI on 2026-11-11. Trusted publishing (no long-lived token) is recommended.

1. PyPI account with 2FA enabled (required for publishing).
2. Trusted publishing: https://pypi.org/manage/account/publishing/ → **Add a new pending publisher**: PyPI project name `calcbloc`, owner `itmarkerz`, repository `calcbloc-python`, workflow file name (e.g. `publish.yml`), environment `pypi`.
3. In the GitHub repository: Settings → Environments → create `pypi` (optionally require a reviewer). The workflow needs `permissions: id-token: write` and the step `pypa/gh-action-pypi-publish@release/v1`, running on a published release or a `v*` tag.
4. Optional dry run on TestPyPI (https://test.pypi.org) with its own pending publisher and `repository-url: https://test.pypi.org/legacy/`.
5. Bump the version in `pyproject.toml`, tag `v<version>`, publish the GitHub release; the workflow builds and uploads.
6. Token alternative (if not using trusted publishing): `python -m build`, `python -m twine check dist/*`, `python -m twine upload dist/*` with username `__token__` and an API token; after the first upload replace an account-wide token with a project-scoped one.
7. Then set `calcblocData.packages.python.published` to `true` in this repository's `package.json`, `npm run build`, commit (the README switches from "coming soon" to the install command).

The PyPI long description is generated at build time by `hatch_build.py` (a hatchling metadata hook) from README.md, with the README's calcbloc.com and itmarkerz.co.in links retagged `utm_medium=pypi` (GitHub keeps `utm_medium=readme`). Nothing to run by hand: `python -m build` applies it; check `PKG-INFO` in the sdist if in doubt.

**Verify:** https://pypi.org/project/calcbloc/ shows the README (its calcbloc.com links carry `utm_medium=pypi`), version, licence metadata (code MIT, bundled data CC BY 4.0), project URLs; in a fresh virtual environment `pip install calcbloc` works and the package imports and reports the expected version and data date.

## 7. npm: `calcbloc` (repository `itmarkerz/calcbloc-js`)

The name `calcbloc` was free on npm on 2026-11-11.

1. npm account; enable 2FA for authorisation and writes: `npm profile enable-2fa auth-and-writes` (or on npmjs.com → Account → Two-Factor Authentication).
2. `npm login`, then `npm whoami` shows the account.
3. In the package repository: `npm view calcbloc` (expect a 404 before the first publish), run its tests, `npm pack --dry-run` and read the file list (only the built files, data, README, LICENSE). `prepack` swaps in the npm README (links retagged `utm_medium=npm` by `scripts/npm-readme.mjs`) and `postpack` restores the GitHub README; after a pack, `git status` in that repository must be clean.
4. First publish: `npm publish --access public` and enter the one-time password when asked. Unscoped packages are public anyway; the flag is harmless.
5. Optional, after the first publish: npmjs.com → package → Settings → **Trusted Publisher** → GitHub Actions (organization `itmarkerz`, repository `calcbloc-js`, workflow file), so later releases publish from CI with provenance and no token; then disallow token publishing in the package settings.
6. Then set `calcblocData.packages.node.published` to `true` in this repository's `package.json`, `npm run build`, commit.

**Verify:** https://www.npmjs.com/package/calcbloc shows the README (its calcbloc.com links carry `utm_medium=npm`), version, licence and repository link; in an empty folder `npm install calcbloc` works and both `import` (ESM) and, if offered, `require` (CJS) load it, with TypeScript types resolved.

## 8. Packagist: `calcbloc/calcbloc` (repository `itmarkerz/calcbloc-php`)

The package name `calcbloc/calcbloc` was free on Packagist on 2026-11-11; the vendor name `calcbloc` is claimed by the first package submitted under it.

1. In the package repository, check `composer.json`: `"name": "calcbloc/calcbloc"`, `description`, `license` (code MIT; say in the README that the bundled data is CC BY 4.0), `type: library`, PSR-4 `autoload`, `require.php`, `homepage` and `support` URLs. Leave out the `version` field: Packagist takes versions from git tags. Run `composer validate --strict` and the test suite.
2. Tag a release in `itmarkerz/calcbloc-php` (for example `v1.0.0`) and push the tag.
3. Sign in at https://packagist.org (with GitHub, using an account that can see the `itmarkerz` organization), choose **Submit**, enter `https://github.com/itmarkerz/calcbloc-php` and confirm.
4. Automatic updates: with GitHub sign-in, Packagist offers to set up the GitHub hook itself (the Packagist GitHub app or OAuth app needs access to the `itmarkerz` organization). Otherwise add a webhook in the repository settings: payload URL `https://packagist.org/api/github?username=<packagist-user>`, content type `application/json`, secret = your Packagist API token (Profile → Show API Token), event "Just the push event".
5. Packagist renders the README straight from the GitHub repository, so its links keep `utm_medium=readme` (no separate Packagist variant is possible); `homepage` and `support.docs` in composer.json carry `utm_medium=package`.
6. Optional: add a second maintainer on the Packagist package page so the package does not depend on one account.
7. Then set `calcblocData.packages.php.published` to `true` in this repository's `package.json`, `npm run build`, commit.

**Verify:** https://packagist.org/packages/calcbloc/calcbloc lists the tagged version and no "not auto-updated" warning; pushing a new tag shows up within minutes; in an empty folder `composer require calcbloc/calcbloc` installs it and a short script using the autoloader loads a table.

## 9. After publishing

- calcbloc.com/data: link this repository, the DOI and the Kaggle dataset, and state the CC BY 4.0 licence and the credit line there too (site change).
- Re-run section 0 after each data update, create a new GitHub release (Zenodo archives it as a new version), and push a new Kaggle version (section 3, step 6).
