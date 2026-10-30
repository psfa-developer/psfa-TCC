"use client";

import { calculate } from "./calc";
import { won } from "./format";
import { COST_GROUPS, type Shipment } from "./types";

const KRW = "#,##0";
const FX = "#,##0.00##";
/** 통화별 금액·환율 서식: KRW는 정수, 외화는 소수 */
const amtFmt = (cur: string) => (cur === "KRW" ? KRW : FX);
const fxFmt = (cur: string) => (cur === "KRW" ? "0" : "#,##0.00##");

/** 원가 계산서를 .xlsx 로 내려받습니다 (ExcelJS는 필요할 때만 불러옴) */
export async function downloadExcel(s: Shipment) {
  const mod = await import("exceljs");
  type WB = typeof mod.Workbook;
  const Workbook: WB = (mod as unknown as { Workbook?: WB }).Workbook ?? (mod as unknown as { default: { Workbook: WB } }).default.Workbook;
  const r = calculate(s);
  const wb = new Workbook();
  wb.creator = "Trade Cost Calculator";
  wb.created = new Date();

  const head = (ws: import("exceljs").Worksheet, row: number) => {
    const rw = ws.getRow(row);
    rw.font = { bold: true, color: { argb: "FF52525B" } };
    rw.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } };
    rw.border = { bottom: { style: "thin", color: { argb: "FFD4D4D8" } } };
    rw.height = 22;
  };

  /* ---------- 요약 ---------- */
  const t = r.totals;
  const ded = s.settings.vatDeductible;
  const byQty = s.settings.allocBasis === "qty";
  const mk = s.settings.markupRate;
  const ru = s.settings.roundUnit;
  const GREY = { color: { argb: "FF71717A" } };
  const ACCENT = { bold: true, color: { argb: "FF0F766E" } };

  const sum = wb.addWorksheet("원가 요약");
  sum.columns = [{ width: 30 }, { width: 10 }, { width: 10 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 13 }, { width: 11 }, { width: 13 }];
  sum.addRow([s.title]).font = { bold: true, size: 16 };
  sum.addRow([[`B/L ${s.blNo || "-"}`, `입항 ${s.arrivalDate || "-"}`, s.supplier, s.memo, `상태: ${s.status === "confirmed" ? "확정" : "견적"}`].filter(Boolean).join(" · ")]).font = GREY;
  sum.addRow([]);

  const kvRow = (label: string, value: number, opts: { bold?: boolean; accent?: boolean; note?: string; line?: boolean } = {}) => {
    const row = sum.addRow([label, null, null, value, opts.note ?? ""]);
    row.getCell(4).numFmt = KRW;
    row.getCell(1).font = opts.bold ? { bold: true } : { color: { argb: "FF52525B" } };
    if (opts.bold) row.getCell(4).font = opts.accent ? { ...ACCENT, size: 12 } : { bold: true };
    row.getCell(5).font = GREY;
    if (opts.line) row.getCell(1).border = row.getCell(4).border = { top: { style: "thin", color: { argb: "FFD4D4D8" } } };
    return row;
  };

  sum.addRow(["금액 구성"]).font = { bold: true, size: 12 };
  kvRow("상품대금", t.goods, { note: "송금 환율 기준" });
  kvRow(t.duty ? "부대비용 (관세 포함)" : "부대비용", t.costSupply + t.duty, { note: `공급가 · ${byQty ? "수량" : "상품금액"} 기준 배분` });
  if (ded) {
    kvRow("= 총 매입가 (원가, VAT 제외)", t.landed, { bold: true, accent: true, line: true });
    kvRow("부가세 (매입세액 공제 · 환급)", t.vatTotal, { note: `수입부가세 ${won(t.importVat)} + 부대비 VAT ${won(t.costVat)} · 원가 제외` });
  } else {
    kvRow("부가세 (미공제 · 원가 포함)", t.vatTotal, { note: `수입부가세 ${won(t.importVat)} + 부대비 VAT ${won(t.costVat)}` });
    kvRow("= 총 매입가 (원가, VAT 포함)", t.landed, { bold: true, accent: true, line: true });
  }
  kvRow("= 필요자금 (VAT 포함, 실제 지출)", t.cash, { bold: true, line: true });
  kvRow("보수적 매입예산", t.safeBudget, { bold: true, note: `개당 +${mk}%, ${won(ru)}원 올림 × 수량` });
  sum.addRow([]);

  sum.addRow(["품목별 개당 매입가"]).font = { bold: true, size: 12 };
  const hr = sum.addRow([
    "품목",
    "용량",
    "갯수",
    "상품대금/개",
    t.duty ? "부대비/개 (관세 포함)" : "부대비/개",
    "부가세/개",
    "개당 매입가 (VAT 제외)",
    "개당 매입가 (VAT 포함)",
    `적용 개당 매입가 (${ded ? "공제" : "미공제"})`,
    `보수적 단가 (+${mk}%)`,
    "단위당 원가",
    "부대비 배분 비율",
  ]);
  head(sum, hr.number);
  hr.alignment = { wrapText: true, vertical: "middle" };
  hr.height = 34;
  s.items.forEach((it, i) => {
    const ir = r.items[i];
    const share = byQty ? (t.qty > 0 ? (it.qty || 0) / t.qty : 0) : ir.share;
    const row = sum.addRow([
      it.name,
      `${it.volume}${it.volumeUnit}`,
      it.qty,
      Math.round(ir.goodsPerUnit),
      Math.round(ir.allocPerUnit),
      Math.round(ir.vatPerUnit),
      Math.round(ir.unitCostExVat),
      Math.round(ir.unitCostIncVat),
      Math.round(ir.unitCost),
      ir.safeUnitCost,
      it.volumeUnit === "ea" ? null : Math.round(ir.perVolume * 100) / 100,
      share,
    ]);
    [3, 4, 5, 6, 7, 8, 9, 10].forEach((c) => (row.getCell(c).numFmt = KRW));
    row.getCell(11).numFmt = "#,##0.00";
    row.getCell(12).numFmt = "0.0%";
    row.getCell(9).font = ACCENT;
    if (ded) row.getCell(6).font = { color: { argb: "FFA1A1AA" }, strike: true };
  });
  sum.addRow([]);
  sum.addRow([
    `설정: 부가세 ${ded ? "공제 (원가 제외)" : "미공제 (원가 포함)"} · 보수적 가산율 ${mk}% · ${won(ru)}원 올림 · 부대비 배분 ${byQty ? "수량" : "상품금액"} 기준`,
  ]).font = GREY;
  if (s.settlementTotal > 0) {
    sum.addRow([
      `정산서 대조: 정산서 ${won(s.settlementTotal)}원 / 입력 ${won(t.settlementCalc)}원 / 차이 ${won(t.settlementDiff ?? 0)}원 (부대비 공급가 + VAT + 수입부가세${t.duty ? " + 관세" : ""})`,
    ]).font = GREY;
  }

  /* ---------- 상품 ---------- */
  const ps = wb.addWorksheet("상품");
  ps.columns = [{ width: 24 }, { width: 8 }, { width: 7 }, { width: 10 }, { width: 11 }, { width: 7 }, { width: 11 }, { width: 9 }, { width: 10 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 14 }];
  const ph = ps.addRow(["제품명", "용량", "단위", "갯수", "수입 단가", "통화", "송금 환율", "관세율%", "부가세", "원화 금액", "과세가격", "관세", "수입부가세"]);
  head(ps, ph.number);
  s.items.forEach((it, i) => {
    const ir = r.items[i];
    const row = ps.addRow([it.name, it.volume, it.volumeUnit, it.qty, it.unitPrice, it.currency, it.fxRate, it.dutyRate / 100, it.taxType === "taxable" ? "VAT 10%" : "VAT 없음", ir.goodsKrw, ir.customsValue, ir.duty, ir.importVat]);
    row.getCell(4).numFmt = KRW;
    row.getCell(5).numFmt = amtFmt(it.currency);
    row.getCell(7).numFmt = fxFmt(it.currency);
    row.getCell(8).numFmt = "0.0%";
    [10, 11, 12, 13].forEach((c) => (row.getCell(c).numFmt = KRW));
  });
  ps.addRow([]);
  ps.addRow([`수입부가세: ${s.importVat.mode === "manual" ? "세관 고지액" : "자동 계산"} · 통관 환율 ${s.importVat.customsFxRate.toLocaleString("ko-KR", { maximumFractionDigits: 4 })} · 과세가격 ${r.totals.customsValue.toLocaleString("ko-KR")}원`]).font = { color: { argb: "FF71717A" } };

  /* ---------- 부대비용 ---------- */
  const cs = wb.addWorksheet("부대비용");
  cs.columns = [{ width: 12 }, { width: 22 }, { width: 30 }, { width: 10 }, { width: 14 }, { width: 7 }, { width: 11 }, { width: 13 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 44 }];
  const chh = cs.addRow(["구분", "항목", "메모", "입력 기준", "금액", "통화", "환율", "세금계산서 VAT", "공급가", "VAT", "합계", "관세 기준(CIF)", "확인 필요"]);
  head(cs, chh.number);
  COST_GROUPS.forEach((g) => {
    let n = 0;
    s.costs.forEach((c, i) => {
      if (c.group !== g.key) return;
      n++;
      const cr = r.costs[i];
      const row = cs.addRow([g.label, c.name, c.note, c.inputMode === "total" && c.taxType === "taxable" ? "합계" : "공급가", c.inputAmount, c.currency, c.fxRate, c.taxType === "taxable" ? "VAT 10%" : "VAT 없음", cr.supply, cr.vat, cr.total,
        g.key === "overseas" ? (c.inCustomsValue ? "포함" : "미포함") : "",
        g.key === "overseas" && c.inCustomsValue && c.taxType === "taxable" ? "CIF 포함 비용에 VAT 10% — 수입부가세와 중복 가능 (보통 영세율)" : "",
      ]);
      if (row.getCell(13).value) {
        row.getCell(13).font = { color: { argb: "FFC2410C" } };
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
      }
      row.getCell(5).numFmt = amtFmt(c.currency);
      row.getCell(7).numFmt = fxFmt(c.currency);
      [9, 10, 11].forEach((k) => (row.getCell(k).numFmt = KRW));
    });
    const gt = r.groups[g.key];
    const sr = cs.addRow(["", `${g.label} 소계 (${n}건)`, "", "", null, "", null, "", gt.supply, gt.vat, gt.total]);
    sr.font = { bold: true, color: { argb: "FF52525B" } };
    sr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
    [9, 10, 11].forEach((k) => (sr.getCell(k).numFmt = KRW));
  });
  const tr = cs.addRow(["합계", `${s.costs.length}건`, "", "", null, "", null, "", r.totals.costSupply, r.totals.costVat, r.totals.costTotal]);
  tr.font = { bold: true };
  tr.border = { top: { style: "medium", color: { argb: "FFA1A1AA" } } };
  [9, 10, 11].forEach((k) => (tr.getCell(k).numFmt = KRW));
  cs.addRow([]);
  cs.addRow([`공급가 ${won(r.totals.costSupply)}원 — 품목별로 배분되어 개당 매입가(원가)에 들어가는 금액`]).font = GREY;
  cs.addRow([`VAT ${won(r.totals.costVat)}원 — ${ded ? "매입세액 공제로 환급 · 원가 제외 (필요자금에만 포함)" : "미공제 · 원가에 포함"}`]).font = GREY;
  cs.addRow([`합계 ${won(r.totals.costTotal)}원 — 물류업체·관세사에 실제로 지급하는 금액`]).font = GREY;

  // 인쇄: 가로 방향, 한 페이지 너비에 맞춤 / 머리글 행 고정
  for (const ws of [sum, ps, cs]) {
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  }
  ps.views = [{ state: "frozen", ySplit: 1 }];
  cs.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `원가계산서_${s.blNo || s.title || "수입건"}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
