/** Preserve the open Bagrut range and psychometric domain of the MTA calculator. */
export function mtaCombinedScore(bagrut: number | undefined, psychometric: number | undefined) {
  if (
    bagrut === undefined ||
    psychometric === undefined ||
    !(bagrut > 60 && bagrut < 130 && psychometric > 200 && psychometric <= 800)
  )
    return undefined;
  return Math.round((psychometric + (bagrut - 30) * 10) / 2);
}
