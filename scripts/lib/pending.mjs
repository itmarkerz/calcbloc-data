/**
 * Public wording for countries the site export lists as pending. The site's own hold notes are written for the
 * maintainers; this repository publishes a neutral sentence instead. scripts/sync-tables.mjs applies it to
 * tables/manifest.json after every export, and the tests check that no other wording slips through.
 */
export const PUBLIC_PENDING_REASONS = {
  belgium: "Held until the 2026 federal income-tax scale is confirmed against the official FPS Finance publication.",
};

export const DEFAULT_PENDING_REASON = "Held until its tables are complete and confirmed against the official sources.";

export const publicPendingReason = (country) => PUBLIC_PENDING_REASONS[country] ?? DEFAULT_PENDING_REASON;

/** Replace every pending reason in a manifest object with its public wording (returns the same object). */
export function sanitizeManifest(manifest) {
  manifest.pending = (manifest.pending ?? []).map((p) => ({ ...p, reason: publicPendingReason(p.country) }));
  return manifest;
}
