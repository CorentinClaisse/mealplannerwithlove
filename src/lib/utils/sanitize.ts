/**
 * Escape special characters for PostgREST ilike/like filters.
 * Escapes SQL wildcards (%, _) and PostgREST filter metacharacters (, . ( ))
 */
export function escapePostgrestSearch(input: string): string {
  return input
    .replace(/\\/g, "\\\\") // backslash first
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,")
    .replace(/\./g, "\\.")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}
