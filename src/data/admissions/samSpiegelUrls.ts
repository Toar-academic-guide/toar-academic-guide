/** Replace the retired institution hostname in catalogue values after a successful read. */
export function repairSamSpiegelUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/(?:www\.)?spieldocs\.ac\.il/gi, 'www.jsfs.co.il') as T;
  }
  if (Array.isArray(value)) return value.map(repairSamSpiegelUrls) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, repairSamSpiegelUrls(entry)]),
    ) as T;
  }
  return value;
}
