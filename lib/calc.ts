import { add, allocate, dec, floor, mul, mulRound, type Dec } from "./money";
import type { CostGroup, CostLine, Item, Shipment } from "./types";

const VAT_RATE = 10; // %

/** 10원 미만 절사 (관세·수입부가세 세액 기준) */
const trunc10 = (n: number) => Math.floor(n / 10) * 10;

/** 원화 환산 (외화는 행 단위로 원 반올림) */
export function toKrw(amount: number, currency: string, fxRate: number): number {
  if (currency === "KRW") return mulRound(amount);
  return mulRound(amount, fxRate);
}

export interface CostResult {
  id: string;
  krwBase: number;
  supply: number;
  vat: number;
  total: number;
}

/**
 * 부대비용 한 행 계산
 * - 면세: 공급가 = 합계 = 원화금액, VAT 0
 * - 과세 + 공급가 입력: VAT = 공급가 × 10% (원 미만 절사)
 * - 과세 + 합계 입력: 공급가 = 합계 ÷ 1.1 (반올림), VAT = 합계 − 공급가
 */
export function calcCost(line: Pick<CostLine, "id" | "currency" | "fxRate" | "taxType" | "inputMode" | "inputAmount">): CostResult {
  const krwBase = toKrw(line.inputAmount || 0, line.currency, line.fxRate || 0);
  if (line.taxType === "exempt") {
    return { id: line.id, krwBase, supply: krwBase, vat: 0, total: krwBase };
  }
  if (line.inputMode === "total") {
    const t = BigInt(krwBase);
    // half-up(total × 10 / 11) = floor((20·total + 11) / 22)
    const supply = Number((t * BigInt(20) + BigInt(11)) / BigInt(22));
    return { id: line.id, krwBase, supply, vat: krwBase - supply, total: krwBase };
  }
  const vat = Math.floor((krwBase * VAT_RATE) / 100);
  return { id: line.id, krwBase, supply: krwBase, vat, total: krwBase + vat };
}

export interface ItemResult {
  id: string;
  /** 상품대금 원화 (송금 환율) */
  goodsKrw: number;
  /** 과세가격 배분액 (통관 환율 기준) */
  customsValue: number;
  duty: number;
  importVat: number;
  /** 배분된 부대비 공급가 */
  allocSupply: number;
  /** 배분된 부대비 VAT */
  allocVat: number;
  /** 원가 합계 (VAT 공제 시 VAT 제외) */
  landed: number;
  /** 필요자금 (VAT 포함) */
  cash: number;
  unitCost: number;
  safeUnitCost: number;
  /** 용량 1단위당 원가 (원/ml 등) */
  perVolume: number;
  goodsPerUnit: number;
  /** 개당 부대비 (배분 공급가 + 관세, VAT 제외) */
  allocPerUnit: number;
  /** 개당 부가세 (수입부가세 + 부대비 VAT 배분) */
  vatPerUnit: number;
  /** VAT 제외 개당 원가 (공제 시) */
  unitCostExVat: number;
  /** VAT 포함 개당 원가 (미공제 시) */
  unitCostIncVat: number;
  /** 상품금액 비중 0~1 */
  share: number;
}

export interface CalcResult {
  items: ItemResult[];
  costs: CostResult[];
  groups: Record<CostGroup, { supply: number; vat: number; total: number; count: number }>;
  totals: {
    qty: number;
    goods: number;
    costSupply: number;
    costVat: number;
    costTotal: number;
    duty: number;
    importVat: number;
    /** 자동 계산 수입부가세 (manual 모드여도 참고용으로 계산) */
    autoImportVat: number;
    customsValue: number;
    landed: number;
    /** 보수적 매입예산 = Σ(보수적 단가 × 수량) */
    safeBudget: number;
    cash: number;
    vatTotal: number;
    /** 관세사 정산서와 대조할 금액 = 부대비 합계 + 관세 + 수입부가세 */
    settlementCalc: number;
    settlementDiff: number | null;
  };
}

export function calculate(s: Shipment): CalcResult {
  const items = s.items;
  const costs = s.costs.map(calcCost);

  // 그룹 소계
  const groups: CalcResult["groups"] = {
    overseas: { supply: 0, vat: 0, total: 0, count: 0 },
    customs: { supply: 0, vat: 0, total: 0, count: 0 },
    domestic: { supply: 0, vat: 0, total: 0, count: 0 },
  };
  s.costs.forEach((c, i) => {
    const g = groups[c.group] ?? groups.overseas;
    g.supply += costs[i].supply;
    g.vat += costs[i].vat;
    g.total += costs[i].total;
    g.count += 1;
  });

  const costSupply = costs.reduce((a, c) => a + c.supply, 0);
  const costVat = costs.reduce((a, c) => a + c.vat, 0);

  // 1) 상품대금 (송금 환율)
  const goodsKrw = items.map((it) =>
    it.currency === "KRW" ? mulRound(it.unitPrice || 0, it.qty || 0) : mulRound(it.unitPrice || 0, it.qty || 0, it.fxRate || 0),
  );

  // 2) 과세가격 (통관 환율 + CIF 비용)
  const cfx = s.importVat.customsFxRate || 0;
  const goodsCustomsDec: Dec[] = items.map((it) =>
    it.currency === "KRW" ? mul(dec(it.unitPrice || 0), dec(it.qty || 0)) : mul(dec(it.unitPrice || 0), dec(it.qty || 0), dec(cfx)),
  );
  const cifCosts = s.costs.reduce((a, c, i) => a + (c.inCustomsValue ? costs[i].supply : 0), 0);
  const customsValue = floor(add(...goodsCustomsDec, dec(cifCosts)));
  const goodsCustomsKrw = goodsCustomsDec.map((d) => floor(d));
  const cvItems = allocate(customsValue, goodsCustomsKrw);

  // 3) 관세
  const duty = items.map((it, i) => trunc10(floor(mul(dec(cvItems[i]), dec(it.dutyRate || 0))) / 100));

  // 4) 수입부가세
  const vatBase = items.reduce((a, it, i) => a + (it.taxType === "taxable" ? cvItems[i] + duty[i] : 0), 0);
  const autoImportVat = trunc10(Math.floor((vatBase * VAT_RATE) / 100));
  const importVatTotal = s.importVat.mode === "manual" ? Math.round(s.importVat.manualKrw || 0) : autoImportVat;
  const importVat = allocate(
    importVatTotal,
    items.map((it, i) => (it.taxType === "taxable" ? goodsKrw[i] : 0)),
  );

  // 5) 부대비 배분
  const weights = s.settings.allocBasis === "qty" ? items.map((it) => it.qty || 0) : goodsKrw;
  const allocSupply = allocate(costSupply, weights);
  const allocVat = allocate(costVat, weights);

  const goodsTotal = goodsKrw.reduce((a, b) => a + b, 0);
  const markup = 1 + (s.settings.markupRate || 0) / 100;
  const ru = s.settings.roundUnit > 0 ? s.settings.roundUnit : 1;
  const deductible = s.settings.vatDeductible;

  const itemResults: ItemResult[] = items.map((it, i) => {
    const landed = goodsKrw[i] + allocSupply[i] + duty[i] + (deductible ? 0 : importVat[i] + allocVat[i]);
    const cash = goodsKrw[i] + allocSupply[i] + allocVat[i] + duty[i] + importVat[i];
    const qty = it.qty || 0;
    const unitCost = qty > 0 ? landed / qty : 0;
    const safeUnitCost = qty > 0 ? Math.ceil((unitCost * markup) / ru - 1e-9) * ru : 0;
    return {
      id: it.id,
      goodsKrw: goodsKrw[i],
      customsValue: cvItems[i],
      duty: duty[i],
      importVat: importVat[i],
      allocSupply: allocSupply[i],
      allocVat: allocVat[i],
      landed,
      cash,
      unitCost,
      safeUnitCost,
      perVolume: it.volume > 0 ? unitCost / it.volume : 0,
      goodsPerUnit: qty > 0 ? goodsKrw[i] / qty : 0,
      allocPerUnit: qty > 0 ? (allocSupply[i] + duty[i]) / qty : 0,
      vatPerUnit: qty > 0 ? (importVat[i] + allocVat[i]) / qty : 0,
      unitCostExVat: qty > 0 ? (goodsKrw[i] + allocSupply[i] + duty[i]) / qty : 0,
      unitCostIncVat: qty > 0 ? cash / qty : 0,
      share: goodsTotal > 0 ? goodsKrw[i] / goodsTotal : 0,
    };
  });

  const dutyTotal = duty.reduce((a, b) => a + b, 0);
  const settlementCalc = costSupply + costVat + dutyTotal + importVatTotal;

  return {
    items: itemResults,
    costs,
    groups,
    totals: {
      qty: items.reduce((a, it) => a + (it.qty || 0), 0),
      goods: goodsTotal,
      costSupply,
      costVat,
      costTotal: costSupply + costVat,
      duty: dutyTotal,
      importVat: importVatTotal,
      autoImportVat,
      customsValue,
      landed: itemResults.reduce((a, r) => a + r.landed, 0),
      safeBudget: itemResults.reduce((a, r, i) => a + r.safeUnitCost * (items[i].qty || 0), 0),
      cash: itemResults.reduce((a, r) => a + r.cash, 0),
      vatTotal: costVat + importVatTotal,
      settlementCalc,
      settlementDiff: s.settlementTotal > 0 ? settlementCalc - s.settlementTotal : null,
    },
  };
}
