/**
 * Build a PostgREST `or` filter that matches `term` (case-insensitive substring)
 * against any of `columns`. The value is double-quoted and escaped so user input
 * containing commas, parentheses, dots or quotes can't inject extra filter clauses.
 */
export function ilikeAnyFilter(columns: string[], term: string): string {
  const pattern = `%${term}%`.replace(/[\\"]/g, "\\$&")
  return columns.map((column) => `${column}.ilike."${pattern}"`).join(",")
}
