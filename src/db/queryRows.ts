/** Raw Drizzle results differ between node-postgres and the isolated postgres.js fixtures. */
export function queryRows<T>(result: T[] | { rows: T[] }): T[] {
  return Array.isArray(result) ? result : result.rows;
}
