// @rev kc-31
const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000;

// YYYY-MM-DD
export function almatyDate(iso: string): string {
  return new Date(Date.parse(iso) + ALMATY_OFFSER_MS).toISOString().slice(0, 10);
}
