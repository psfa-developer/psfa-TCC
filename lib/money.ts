/**
 * 금액 계산용 정확한 10진수 헬퍼.
 * JS number(부동소수)로 650 × 1677.77 을 계산하면 1,090,550.4999… 가 되어
 * 반올림 결과가 서류(1,090,551)와 달라질 수 있습니다. 그래서 모든 곱셈은
 * 10진 문자열 → BigInt 로 바꿔 정확히 계산한 뒤 마지막에 한 번만 반올림합니다.
 */

export interface Dec {
  v: bigint; // 정수부+소수부를 이어 붙인 값
  s: number; // 소수 자릿수
}

const TEN = BigInt(10);
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);

function pow10(n: number): bigint {
  let r = ONE;
  for (let i = 0; i < n; i++) r *= TEN;
  return r;
}

export function dec(n: number): Dec {
  if (!Number.isFinite(n)) return { v: ZERO, s: 0 };
  // 지수 표기를 피하기 위해 최대 12자리 소수로 고정한 뒤 끝의 0 제거
  let str = Math.abs(n) >= 1e21 ? n.toFixed(0) : n.toString();
  if (/e/i.test(str)) str = n.toFixed(12).replace(/\.?0+$/, "");
  const neg = str.startsWith("-");
  if (neg) str = str.slice(1);
  const [i, f = ""] = str.split(".");
  const v = BigInt(i + f) * (neg ? -ONE : ONE);
  return { v, s: f.length };
}

export function mul(...xs: Dec[]): Dec {
  return xs.reduce((a, b) => ({ v: a.v * b.v, s: a.s + b.s }), { v: ONE, s: 0 });
}

export function add(...xs: Dec[]): Dec {
  const s = Math.max(0, ...xs.map((x) => x.s));
  return { v: xs.reduce((acc, x) => acc + x.v * pow10(s - x.s), ZERO), s };
}

/** 반올림(half-up, 0에서 멀어지는 방향) → 정수 number */
export function round(d: Dec): number {
  if (d.s === 0) return Number(d.v);
  const p = pow10(d.s);
  const neg = d.v < ZERO;
  const a = neg ? -d.v : d.v;
  let q = a / p;
  if ((a % p) * TWO >= p) q += ONE;
  return Number(neg ? -q : q);
}

/** 버림(0 방향) → 정수 number */
export function floor(d: Dec): number {
  if (d.s === 0) return Number(d.v);
  return Number(d.v / pow10(d.s));
}

/** 여러 수를 정확히 곱한 뒤 원 단위 반올림 */
export function mulRound(...ns: number[]): number {
  return round(mul(...ns.map(dec)));
}

/**
 * 정수 total 을 가중치 비율로 정확히 나눕니다 (최대 잔여법).
 * 결과 합계는 항상 total 과 같습니다.
 */
export function allocate(total: number, weights: number[]): number[] {
  const W = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (W <= 0 || total === 0) return weights.map(() => 0);
  const t = BigInt(Math.round(total));
  const ws = weights.map((w) => BigInt(Math.round(Math.max(0, w))));
  const Wb = ws.reduce((a, b) => a + b, ZERO);
  const neg = t < ZERO;
  const at = neg ? -t : t;
  const base = ws.map((w) => (at * w) / Wb);
  const rem = ws.map((w, i) => at * w - base[i] * Wb);
  let left = at - base.reduce((a, b) => a + b, ZERO);
  const order = rem
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  for (const { i } of order) {
    if (left <= ZERO) break;
    if (ws[i] === ZERO) continue;
    base[i] += ONE;
    left -= ONE;
  }
  return base.map((b) => Number(neg ? -b : b));
}
