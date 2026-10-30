const nf0 = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

/** 원 단위 정수 표기: 1,234,567 */
export const won = (n: number) => nf0.format(Math.round(n || 0));

/** 소수 자릿수 지정 표기 */
export const fixed = (n: number, digits: number) =>
  new Intl.NumberFormat("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n || 0);

/** 입력값 표기: 정수는 쉼표, 소수는 있는 자리까지 */
export const inputFmt = (n: number, maxDigits = 6) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: maxDigits }).format(n || 0);

export const pct = (r: number, digits = 1) => `${fixed(r * 100, digits)}%`;

/** "1,234.5" 같은 입력 문자열 → number (잘못된 값은 0) */
export function parseNum(s: string): number {
  const v = Number(s.replace(/[,\s원%]/g, ""));
  return Number.isFinite(v) ? v : 0;
}

export function timeAgo(ms?: number): string {
  if (!ms) return "";
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return "방금";
  if (d < 3600) return `${Math.floor(d / 60)}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`;
  return new Date(ms).toLocaleDateString("ko-KR");
}
