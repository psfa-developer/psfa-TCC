"use client";

import type { CalcResult } from "@/lib/calc";
import { fixed, won } from "@/lib/format";
import type { Shipment } from "@/lib/types";
import { Icon, NumInput } from "./ui";

export function SummaryPanel({ s, r, onSettlement }: { s: Shipment; r: CalcResult; onSettlement: (v: number) => void }) {
  const t = r.totals;
  const ded = s.settings.vatDeductible;
  const parts = [
    { key: "goods", label: "상품대금", value: t.goods, cls: "c1" },
    { key: "cost", label: t.duty ? "부대비용 (관세 포함)" : "부대비용", value: t.costSupply + t.duty, cls: "c2" },
    { key: "vat", label: "부가세", value: t.vatTotal, cls: "c3" },
  ];
  const sum = parts.reduce((a, p) => a + p.value, 0) || 1;
  const diff = t.settlementDiff;
  const mk = s.settings.markupRate;
  const ru = s.settings.roundUnit;

  return (
    <aside className="summary" aria-label="실시간 요약">
      <div className="sum-hero">
        <div className="sum-k">총 매입가 · {s.settings.vatDeductible ? "VAT 제외" : "VAT 포함"}</div>
        <div className="sum-big">
          {won(t.landed)}
          <span>원</span>
        </div>
        <div className="sum-safe" title={`품목별 보수적 단가(개당 매입가 × (1 + ${mk}%), ${won(ru)}원 올림) × 수량의 합계`}>
          <span>
            보수적 매입예산 <em>개당 +{fixed(mk, mk % 1 ? 1 : 0)}%, {won(ru)}원 올림 × 수량</em>
          </span>
          <b>{won(t.safeBudget)}원</b>
        </div>
        <div
          className="stack"
          role="img"
          aria-label={`필요자금 구성: ${parts.map((p) => `${p.label} ${fixed((p.value / sum) * 100, 1)}%`).join(", ")}`}
        >
          {parts.map((p) => (
            <div key={p.key} className={`${p.cls} ${p.key === "vat" && ded ? "off" : ""}`} style={{ width: `${(p.value / sum) * 100}%` }} />
          ))}
        </div>
        <div className="sum-legend">
          <div>
            <i className="c1" />
            <span className="grow">상품대금</span>
            <span className="num-i">{won(parts[0].value)}</span>
          </div>
          <div>
            <i className="c2" />
            <span className="grow">{parts[1].label}</span>
            <span className="num-i">{won(parts[1].value)}</span>
          </div>
          {ded ? (
            <>
              <div className="sum-sub">
                <span className="grow">= 총 매입가 (원가)</span>
                <span className="num-i">{won(t.landed)}</span>
              </div>
              <div className="vat-row">
                <i className="c3 off" />
                <span className="grow">
                  부가세 <em>매입세액 공제 · 환급</em>
                </span>
                <span className="num-i">{won(t.vatTotal)}</span>
              </div>
            </>
          ) : (
            <div>
              <i className="c3" />
              <span className="grow">
                부가세 <em className="warn-em">미공제 · 원가 포함</em>
              </span>
              <span className="num-i">{won(t.vatTotal)}</span>
            </div>
          )}
          <div className="sum-sub total">
            <span className="grow">= 필요자금 (VAT 포함, 실제 지출)</span>
            <span className="num-i">{won(t.cash)}원</span>
          </div>
        </div>
      </div>

      <div className="card pad">
        <div className="card-title">품목별 개당 매입가</div>
        {s.items.length === 0 && <p className="empty">상품을 추가하면 여기에 개당 매입가가 표시됩니다.</p>}
        {s.items.map((it, i) => {
          const ir = r.items[i];
          if (!ir) return null;
          const ded = s.settings.vatDeductible;
          const byQty = s.settings.allocBasis === "qty";
          const allocShare = byQty ? (r.totals.qty > 0 ? (it.qty || 0) / r.totals.qty : 0) : ir.share;
          const base = ded ? ir.unitCostExVat : ir.unitCostIncVat;
          const w = (v: number) => (base > 0 ? `${(v / base) * 100}%` : "0%");
          return (
            <div key={it.id} className="unit-card">
              <div className="unit-top">
                <span className="unit-name">{it.name || "이름 없음"}</span>
                {it.volume > 0 && (
                  <span className="badge">
                    {fixed(it.volume, Number.isInteger(it.volume) ? 0 : 2)}
                    {it.volumeUnit}
                  </span>
                )}
                <span className="grow" />
                <span className="unit-cost">{won(ir.unitCost)}</span>
                <span className="unit-suffix">원/개</span>
              </div>
              <div className="mini-stack">
                <div className="c1" style={{ width: w(ir.goodsPerUnit) }} />
                <div className="c2" style={{ width: w(ir.allocPerUnit) }} />
                {!ded && <div className="c3" style={{ width: w(ir.vatPerUnit) }} />}
              </div>
              <div className="unit-break">
                <div>
                  <i className="dot c1" />
                  <span className="grow">상품대금</span>
                  <b>{won(ir.goodsPerUnit)}</b>
                </div>
                <div>
                  <i className="dot c2" />
                  <span className="grow">
                    부대비{ir.duty > 0 ? " (관세 포함)" : ""}
                    <span className="vat-tag basis" title={byQty ? "부대비를 수량 비율로 배분" : "부대비를 상품대금 비율로 배분"}>
                      {byQty ? "수량" : "상품금액"} 기준 {fixed(allocShare * 100, 1)}%
                    </span>
                  </span>
                  <b>{won(ir.allocPerUnit)}</b>
                </div>
                <div className={ded ? "vat-off" : ""}>
                  <i className="dot c3" />
                  <span className="grow">
                    부가세 <span className={`vat-tag ${ded ? "off" : "on"}`}>{ded ? "공제 · 원가 제외" : "미공제 · 원가 포함"}</span>
                  </span>
                  <b>{won(ir.vatPerUnit)}</b>
                </div>
                <div className="unit-alt">
                  <span className="grow">VAT {ded ? "포함" : "제외"} 시 개당 매입가</span>
                  <span>{won(ded ? ir.unitCostIncVat : ir.unitCostExVat)}원</span>
                </div>
              </div>
              <div className="unit-grid">
                <span>{it.volume > 0 && it.volumeUnit !== "ea" ? `${it.volumeUnit}당 원가` : ""}</span>
                <span className="ta-r">
                  {it.volume > 0 && it.volumeUnit !== "ea" ? (
                    <b>{fixed(ir.perVolume, 2)}원</b>
                  ) : null}
                </span>
                <span title={`개당 매입가 × (1 + ${mk}%), ${won(ru)}원 단위 올림`}>보수적 단가 (+{fixed(mk, mk % 1 ? 1 : 0)}%)</span>
                <span className="ta-r strong">{won(ir.safeUnitCost)}원</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card pad">
        <div className="card-title-row">
          <span className="card-title grow">정산서 대조</span>
          {diff === null ? (
            <span className="pill muted">미입력</span>
          ) : diff === 0 ? (
            <span className="pill ok">
              <Icon name="check" size={14} stroke={2.4} /> 일치
            </span>
          ) : (
            <span className="pill warn">
              <Icon name="alert" size={14} stroke={2.2} /> 차이 있음
            </span>
          )}
        </div>
        <div className="settle">
          <label className="settle-row">
            <span className="grow muted-t">관세사 정산서 총액</span>
            <NumInput label="관세사 정산서 총액" value={s.settlementTotal} digits={0} width={136} onChange={onSettlement} />
          </label>
          <div className="settle-row">
            <span className="grow muted-t">입력 비용 합계</span>
            <span className="num-i strong-soft">{won(t.settlementCalc)}</span>
          </div>
          <div className="settle-note">
            부대비 공급가 {won(t.costSupply)} + VAT {won(t.costVat)} + 수입부가세 {won(t.importVat)}
            {t.duty ? ` + 관세 ${won(t.duty)}` : ""}
          </div>
          <div className="settle-row total">
            <span className="grow">차이</span>
            <span className={`num-i ${diff === 0 ? "ok-t" : diff === null ? "" : "warn-t"}`}>{diff === null ? "—" : `${diff > 0 ? "+" : ""}${won(diff)}원`}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
