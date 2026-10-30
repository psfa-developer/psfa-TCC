import { test } from "node:test";
import assert from "node:assert/strict";
import { calcCost, calculate, toKrw } from "./calc";
import { allocate, mulRound } from "./money";
import { sampleShipment } from "./sample";

test("외화 환산은 정확한 10진 계산 후 반올림 (서류 금액과 일치)", () => {
  assert.equal(mulRound(650, 1677.77), 1090551); // p2 해상운임
  assert.equal(mulRound(1550, 1677.77), 2600544); // p2 EXW
  assert.equal(toKrw(75970, "KRW", 1), 75970);
});

test("과세 + 공급가 입력 → VAT 자동", () => {
  const r = calcCost({ id: "a", currency: "KRW", fxRate: 1, taxType: "taxable", inputMode: "supply", inputAmount: 387400 });
  assert.deepEqual([r.supply, r.vat, r.total], [387400, 38740, 426140]); // p8 창고료
});

test("과세 + 합계 입력 → 공급가·VAT 자동 (합이 정확히 유지)", () => {
  const r = calcCost({ id: "a", currency: "KRW", fxRate: 1, taxType: "taxable", inputMode: "total", inputAmount: 950950 });
  assert.deepEqual([r.supply, r.vat, r.total], [864500, 86450, 950950]); // p5~6 보세운송
  for (const t of [1, 10, 11, 999, 12345, 181500, 7777777]) {
    const x = calcCost({ id: "b", currency: "KRW", fxRate: 1, taxType: "taxable", inputMode: "total", inputAmount: t });
    assert.equal(x.supply + x.vat, t);
  }
});

test("면세 → VAT 0", () => {
  const r = calcCost({ id: "a", currency: "EUR", fxRate: 1677.77, taxType: "exempt", inputMode: "supply", inputAmount: 650 });
  assert.deepEqual([r.supply, r.vat, r.total], [1090551, 0, 1090551]);
});

test("배분 합계는 항상 원래 금액과 같다", () => {
  const a = allocate(8114500, [59953440, 19513613]);
  assert.equal(a[0] + a[1], 8114500);
  assert.deepEqual(a, [6121936, 1992564]);
  assert.deepEqual(allocate(10, [1, 1, 1]), [4, 3, 3]);
});

test("CSE260666: 정산서 총액 14,280,004원과 일치", () => {
  const r = calculate(sampleShipment());
  assert.equal(r.totals.costSupply, 5966594);
  assert.equal(r.totals.costVat, 198910);
  assert.equal(r.totals.importVat, 8114500);
  assert.equal(r.totals.settlementCalc, 14280004);
  assert.equal(r.totals.settlementDiff, 0);
  assert.equal(r.groups.overseas.supply, 4142494);
  assert.equal(r.groups.customs.supply, 312200);
  assert.equal(r.groups.domestic.supply, 1511900);
});

test("CSE260666: 수입부가세 자동 계산 = 세관 고지액 8,114,500원", () => {
  const s = sampleShipment();
  s.importVat.mode = "auto";
  const r = calculate(s);
  assert.equal(r.totals.customsValue, 81145030); // 수입신고필증 과세가격
  assert.equal(r.totals.autoImportVat, 8114500);
  assert.equal(r.totals.importVat, 8114500);
});

test("CSE260666: 송금 환율 1,711원 기준 개당 원가", () => {
  const r = calculate(sampleShipment(1711));
  assert.equal(r.totals.goods, 79467053);
  assert.equal(r.totals.landed, 85433647);
  assert.equal(r.totals.cash, 93747057);
  const [a, b] = r.items;
  assert.equal(Math.round(a.unitCost), 5371);
  assert.equal(Math.round(b.unitCost), 1987);
  assert.equal(a.safeUnitCost, 5700);
  assert.equal(b.safeUnitCost, 2100);
});

test("VAT 미공제면 VAT가 원가에 포함된다", () => {
  const s = sampleShipment(1711);
  s.settings.vatDeductible = false;
  const r = calculate(s);
  assert.equal(r.totals.landed, r.totals.cash);
});

test("개당 부가세 · VAT 포함/제외 단가", () => {
  const r = calculate(sampleShipment(1711));
  const a = r.items[0];
  assert.equal(Math.round(a.unitCostExVat), 5371);
  assert.equal(Math.round(a.unitCostIncVat), 5894);
  assert.ok(Math.abs(a.goodsPerUnit + a.allocPerUnit + a.vatPerUnit - a.unitCostIncVat) < 1e-6);
  const s2 = sampleShipment(1711);
  s2.settings.vatDeductible = false;
  assert.equal(Math.round(calculate(s2).items[0].unitCost), 5894);
});

test("보수적 매입예산 = Σ 보수적 단가 × 수량", () => {
  const r = calculate(sampleShipment(1711));
  assert.equal(r.totals.safeBudget, 5700 * 12000 + 2100 * 10560); // 90,576,000
});
