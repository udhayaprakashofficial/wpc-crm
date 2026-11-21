/** Indian FY helpers. fyStartMonth: 1=Jan … 4=April (default). */

export function getFyBounds(fyStartMonth: number, ref = new Date()) {
  const year = ref.getFullYear();
  const month = ref.getMonth() + 1; // 1-12
  const fyStartYear = month >= fyStartMonth ? year : year - 1;
  const start = new Date(fyStartYear, fyStartMonth - 1, 1, 0, 0, 0, 0);
  const end = new Date(fyStartYear + 1, fyStartMonth - 1, 1, 0, 0, 0, 0);
  return { fyYear: fyStartYear, start, end };
}

export function monthsInFy(fyStartMonth: number): number[] {
  const months: number[] = [];
  for (let i = 0; i < 12; i++) {
    months.push(((fyStartMonth - 1 + i) % 12) + 1);
  }
  return months;
}

/** Equal split unless weights provided (12 numbers summing ~100). */
export function splitYearlyTarget(
  targetPaise: number,
  weights?: number[] | null,
): number[] {
  if (weights && weights.length === 12) {
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map((w) => Math.round((targetPaise * w) / sum));
    const diff = targetPaise - raw.reduce((a, b) => a + b, 0);
    raw[0] += diff;
    return raw;
  }
  const base = Math.floor(targetPaise / 12);
  const parts = Array.from({ length: 12 }, () => base);
  parts[0] += targetPaise - base * 12;
  return parts;
}
