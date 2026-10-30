import type { CostGroup, CostLine, Item, Shipment } from "./types";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function newItem(partial: Partial<Item> = {}): Item {
  return {
    id: uid(),
    name: "",
    volume: 0,
    volumeUnit: "ml",
    qty: 0,
    unitPrice: 0,
    currency: "EUR",
    fxRate: 0,
    dutyRate: 0,
    taxType: "taxable",
    ...partial,
  };
}

export function newCost(group: CostGroup, partial: Partial<CostLine> = {}): CostLine {
  return {
    id: uid(),
    group,
    name: "",
    note: "",
    currency: "KRW",
    fxRate: 1,
    taxType: group === "overseas" ? "exempt" : "taxable",
    inputMode: "supply",
    inputAmount: 0,
    inCustomsValue: false,
    ...partial,
  };
}

export function emptyShipment(): Shipment {
  return {
    title: "새 수입 건",
    blNo: "",
    arrivalDate: "",
    supplier: "",
    memo: "",
    status: "estimate",
    items: [newItem()],
    costs: [
      newCost("overseas", { name: "해상운임", currency: "EUR", fxRate: 0, inCustomsValue: true }),
      newCost("overseas", { name: "EXW 현지비용", currency: "EUR", fxRate: 0, inCustomsValue: true }),
      newCost("overseas", { name: "적하보험료", inCustomsValue: true }),
      newCost("customs", { name: "통관수수료" }),
      newCost("domestic", { name: "보세운송료" }),
      newCost("domestic", { name: "보세창고료" }),
      newCost("domestic", { name: "국내운송료" }),
    ],
    importVat: { mode: "auto", customsFxRate: 0, manualKrw: 0 },
    settings: { vatDeductible: true, markupRate: 5, roundUnit: 100, allocBasis: "value" },
    settlementTotal: 0,
  };
}

/**
 * 실적 예시: B/L CSE260666 (이탈리아 올리브오일, 2026-08)
 * 근거: 정산서_풍성에프에이(CSE260666).pdf p1~13
 * 송금 환율 1,711원은 참고값 — 실제 송금증 환율로 바꿔 입력하세요.
 */
export function sampleShipment(remitFx = 1711): Shipment {
  return {
    title: "이탈리아 올리브오일 수입",
    blNo: "CSE260666",
    arrivalDate: "2026-08-02",
    supplier: "CIVIDINI ITALIA S.R.L.S",
    memo: "20′ × 1 FCL · 60 GT · 11,393 kg",
    status: "confirmed",
    items: [
      newItem({ name: "DIVO EVOO", volume: 500, volumeUnit: "ml", qty: 12000, unitPrice: 2.92, currency: "EUR", fxRate: remitFx }),
      newItem({ name: "DIVO EVOO", volume: 100, volumeUnit: "ml", qty: 10560, unitPrice: 1.08, currency: "EUR", fxRate: remitFx }),
    ],
    costs: [
      newCost("overseas", { name: "해상운임", note: "Ocean Freight · 20′×1", currency: "EUR", fxRate: 1677.77, inputAmount: 650, inCustomsValue: true }),
      newCost("overseas", { name: "EXW 현지비용", note: "Ex-Work Charge", currency: "EUR", fxRate: 1677.77, inputAmount: 1550, inCustomsValue: true }),
      newCost("overseas", { name: "적하보험료", note: "Insurance", inputAmount: 75970, inCustomsValue: true }),
      newCost("overseas", { name: "터미널·항만비", note: "THC · Wharfage · 컨테이너 세척 · CMC", inputAmount: 210429 }),
      newCost("overseas", { name: "서류·핸들링·D/O", note: "Document · Handling · D/O Fee", taxType: "taxable", inputAmount: 165000 }),
      newCost("customs", { name: "검역수수료", note: "엘리트 관세사무소", inputAmount: 150000 }),
      newCost("customs", { name: "통관수수료", note: "엘리트 관세사무소", inputAmount: 162200 }),
      newCost("domestic", { name: "보세운송료", note: "부산신항 → 부경김포 · 반납비 포함", inputMode: "total", inputAmount: 950950 }),
      newCost("domestic", { name: "보세창고료", note: "부경로지스틱스 · 보관 4일", inputAmount: 387400 }),
      newCost("domestic", { name: "국내운송료", note: "11톤 · 고촌 → 이천", inputAmount: 260000 }),
    ],
    importVat: { mode: "manual", customsFxRate: 1666.02, manualKrw: 8114500 },
    settings: { vatDeductible: true, markupRate: 5, roundUnit: 100, allocBasis: "value" },
    settlementTotal: 14280004,
  };
}
