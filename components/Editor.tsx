"use client";

import { useMemo, type ReactNode } from "react";
import { calculate, type CalcResult } from "@/lib/calc";
import { pct, won } from "@/lib/format";
import { newCost, newItem } from "@/lib/sample";
import {
  COST_GROUPS,
  CURRENCIES,
  VOLUME_UNITS,
  type CostGroup,
  type CostLine,
  type Item,
  type Shipment,
} from "@/lib/types";
import { Badge, Icon, NumInput, Seg, Select, TextInput, Toggle } from "./ui";
import { SummaryPanel } from "./SummaryPanel";

const TAX_OPTS = [
  { value: "taxable" as const, label: "VAT 10%" },
  { value: "exempt" as const, label: "VAT 없음" },
];
const MODE_OPTS = [
  { value: "supply" as const, label: "공급가" },
  { value: "total" as const, label: "합계" },
];

export function Editor({
  value: s,
  onChange,
}: {
  value: Shipment;
  /** immediate=true 면 자동 저장 대기 없이 바로 저장 */
  onChange: (s: Shipment, opts?: { immediate?: boolean }) => void;
}) {
  const r = useMemo(() => calculate(s), [s]);
  const locked = s.status === "confirmed";

  // 확정 상태에서는 상태 변경 외의 모든 수정을 무시합니다.
  const set = <K extends keyof Shipment>(k: K, v: Shipment[K]) => {
    if (locked && k !== "status") return;
    onChange({ ...s, [k]: v });
  };
  const setItem = (id: string, patch: Partial<Item>) =>
    set(
      "items",
      s.items.map((it) => (it.id === id ? normalizeFx({ ...it, ...patch }) : it)),
    );
  const setCost = (id: string, patch: Partial<CostLine>) =>
    set(
      "costs",
      s.costs.map((c) => (c.id === id ? normalizeFx({ ...c, ...patch }) : c)),
    );

  return (
    <div className={`editor ${locked ? "locked" : ""}`}>
      <ShipmentHeader s={s} set={set} locked={locked} />
      <fieldset className="lockable" disabled={locked}>
        <div className="layout">
          <div className="main-col">
            <ProductsSection s={s} r={r} setItem={setItem} set={set} />
            <CostsSection s={s} r={r} setCost={setCost} set={set} />
            <SettingsSection s={s} set={set} />
          </div>
          <SummaryPanel s={s} r={r} onSettlement={(v) => set("settlementTotal", v)} />
        </div>
      </fieldset>
    </div>
  );
}

/** KRW 행은 환율 1 고정 */
function normalizeFx<T extends { currency: string; fxRate: number }>(x: T): T {
  return x.currency === "KRW" ? { ...x, fxRate: 1 } : x;
}

type SetFn = <K extends keyof Shipment>(k: K, v: Shipment[K]) => void;

/* ================= 헤더 ================= */
function ShipmentHeader({ s, set, locked }: { s: Shipment; set: SetFn; locked: boolean }) {
  return (
    <div className="ship-head">
      <div className="title-row">
        <fieldset className="lockable title-wrap" disabled={locked}>
          <input
            className="title-input"
            aria-label="수입 건 제목"
            style={{ width: `calc(${Math.max(6, [...(s.title || "")].reduce((a, ch) => a + (/[\u3131-\uD79D]/.test(ch) ? 1 : 0.6), 0))}em + 8px)` }}
            value={s.title} onChange={(e) => set("title", e.target.value)} placeholder="수입 건 제목" />
        </fieldset>
      </div>
      <fieldset className="lockable" disabled={locked}>
        <div className="meta-row">
          <label className="meta">
            <Badge>B/L</Badge>
            <input className="meta-input" aria-label="B/L 번호" value={s.blNo} placeholder="B/L 번호" onChange={(e) => set("blNo", e.target.value)} />
          </label>
          <label className="meta">
            <span className="meta-k">입항</span>
            <input className="meta-input" type="date" aria-label="입항일" value={s.arrivalDate} onChange={(e) => set("arrivalDate", e.target.value)} />
          </label>
          <label className="meta">
            <span className="meta-k">공급사</span>
            <input className="meta-input wide" aria-label="해외 공급사" value={s.supplier} placeholder="해외 거래처" onChange={(e) => set("supplier", e.target.value)} />
          </label>
          <label className="meta">
            <span className="meta-k">메모</span>
            <input className="meta-input wide" aria-label="메모" value={s.memo} placeholder="컨테이너·중량 등" onChange={(e) => set("memo", e.target.value)} />
          </label>
        </div>
      </fieldset>
    </div>
  );
}

function SectionHead({ n, title, desc, right }: { n: number; title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="sec-head">
      <span className="sec-num">{n}</span>
      <div className="grow">
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {right}
    </div>
  );
}

/* ================= ① 상품 ================= */
function ProductsSection({
  s,
  r,
  setItem,
  set,
}: {
  s: Shipment;
  r: CalcResult;
  setItem: (id: string, p: Partial<Item>) => void;
  set: SetFn;
}) {
  const iv = s.importVat;
  return (
    <section className="card" aria-label="상품">
      <SectionHead
        n={1}
        title="상품"
        desc="제품별 용량·갯수·개당 원가와 송금 환율을 입력하세요"
        right={
          <button type="button" className="btn ghost" onClick={() => set("items", [...s.items, newItem({ currency: s.items.at(-1)?.currency ?? "EUR", fxRate: s.items.at(-1)?.fxRate ?? 0 })])}>
            <Icon name="plus" stroke={2.2} /> 상품 추가
          </button>
        }
      />
      <div className="scroll-x">
        <div className="grid-table" style={{ minWidth: 1040 }}>
          <div className="gt-row gt-head pgrid">
            <div>제품명</div>
            <div>용량</div>
            <div className="num">갯수</div>
            <div className="num">개당 원가</div>
            <div>통화</div>
            <div className="num">환율</div>
            <div className="num">관세율</div>
            <div>부가세</div>
            <div className="num">원화 금액</div>
            <div className="num">VAT</div>
            <div />
          </div>
          {s.items.map((it, i) => {
            const ir = r.items[i];
            return (
              <div key={it.id} className="gt-row pgrid">
                <div>
                  <TextInput label="제품명" value={it.name} placeholder="제품명" onChange={(v) => setItem(it.id, { name: v })} />
                </div>
                <div className="cell-flex">
                  <NumInput label="용량" value={it.volume} width={64} onChange={(v) => setItem(it.id, { volume: v })} />
                  <Select label="용량 단위" value={it.volumeUnit} options={VOLUME_UNITS} width={60} onChange={(v) => setItem(it.id, { volumeUnit: v })} />
                </div>
                <div>
                  <NumInput label="갯수" value={it.qty} digits={0} onChange={(v) => setItem(it.id, { qty: v })} />
                </div>
                <div>
                  <NumInput label="개당 원가" value={it.unitPrice} onChange={(v) => setItem(it.id, { unitPrice: v })} />
                </div>
                <div>
                  <Select label="통화" value={it.currency} options={CURRENCIES} onChange={(v) => setItem(it.id, { currency: v })} />
                </div>
                <div>
                  <NumInput label="송금 환율" value={it.fxRate} locked={it.currency === "KRW"} onChange={(v) => setItem(it.id, { fxRate: v })} />
                </div>
                <div className="cell-flex">
                  <NumInput label="관세율" value={it.dutyRate} digits={2} width={46} onChange={(v) => setItem(it.id, { dutyRate: v })} />
                  <span className="unit">%</span>
                </div>
                <div>
                  <Seg label="부가세" value={it.taxType} options={TAX_OPTS} onChange={(v) => setItem(it.id, { taxType: v })} />
                </div>
                <div className="num strong">{won(ir?.goodsKrw ?? 0)}</div>
                <div className="num calc">
                  <div>{won(ir?.importVat ?? 0)}</div>
                  {iv.mode === "manual" && it.taxType === "taxable" && <div className="sub">고지액 배분 {pct(ir?.share ?? 0)}</div>}
                </div>
                <div>
                  <RowDelete label="상품 삭제" onClick={() => set("items", s.items.filter((x) => x.id !== it.id))} />
                </div>
              </div>
            );
          })}
          <div className="gt-row gt-foot pgrid">
            <div className="foot-label">상품 합계</div>
            <div />
            <div className="num">{won(r.totals.qty)}</div>
            <div />
            <div />
            <div />
            <div className="num">{r.totals.duty ? won(r.totals.duty) : ""}</div>
            <div />
            <div className="num">{won(r.totals.goods)}</div>
            <div className="num">{won(r.totals.importVat)}</div>
            <div />
          </div>
        </div>
      </div>

      <div className="strip">
        <div className="strip-title">수입부가세</div>
        <Seg
          label="수입부가세 방식"
          value={iv.mode}
          onChange={(v) => set("importVat", { ...iv, mode: v })}
          options={[
            { value: "auto", label: "자동 계산" },
            { value: "manual", label: "세관 고지액" },
          ]}
        />
        <label className="cell-flex">
          <span className="strip-k">통관 환율</span>
          <NumInput label="통관 환율" value={iv.customsFxRate} width={104} onChange={(v) => set("importVat", { ...iv, customsFxRate: v })} />
        </label>
        {iv.mode === "manual" && (
          <label className="cell-flex">
            <span className="strip-k">고지액</span>
            <NumInput label="세관 고지액" value={iv.manualKrw} digits={0} width={128} highlight onChange={(v) => set("importVat", { ...iv, manualKrw: v })} />
            <span className="unit">원</span>
          </label>
        )}
        <div className="strip-note">
          {iv.mode === "manual" ? "상품금액 비율로 배분 · " : ""}
          자동 계산 <b className="num-i">{won(r.totals.autoImportVat)}원</b> (과세가격 {won(r.totals.customsValue)} × 10%)
          {iv.mode === "manual" && iv.manualKrw > 0 && r.totals.autoImportVat !== iv.manualKrw && (
            <span className="warn"> · 고지액과 {won(iv.manualKrw - r.totals.autoImportVat)}원 차이</span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ================= ② 부대비용 ================= */
function CostsSection({
  s,
  r,
  setCost,
  set,
}: {
  s: Shipment;
  r: CalcResult;
  setCost: (id: string, p: Partial<CostLine>) => void;
  set: SetFn;
}) {
  const add = (g: CostGroup) => set("costs", [...s.costs, newCost(g)]);
  return (
    <section className="card" aria-label="부대비용">
      <SectionHead
        n={2}
        title="부대비용"
        desc="공급가 또는 합계 중 아는 금액만 입력하면 나머지는 자동으로 채워집니다"
        right={
          <div className="legend">
            <span>
              <i className="lg-in" />
              입력값
            </span>
            <span>
              <i className="lg-calc" />
              자동 계산
            </span>
          </div>
        }
      />
      <div className="scroll-x">
        <div className="grid-table" style={{ minWidth: 1000 }}>
          <div className="gt-row gt-head cgrid">
            <div>항목</div>
            <div>입력 기준</div>
            <div className="num">금액</div>
            <div>통화</div>
            <div className="num">환율</div>
            <div title="업체 세금계산서에 부가세 10%가 붙는지 (영세율·면세는 VAT 없음)">세금계산서 VAT</div>
            <div className="num">공급가</div>
            <div className="num">VAT</div>
            <div className="num">합계</div>
            <div />
          </div>
          {COST_GROUPS.map((g) => {
            const rows = s.costs.map((c, i) => ({ c, cr: r.costs[i] })).filter((x) => x.c.group === g.key);
            const gt = r.groups[g.key];
            return (
              <div key={g.key} className="group">
                <div className="group-head">
                  <span className="group-name">{g.label}</span>
                  <span className="badge light">{rows.length}건</span>
                  <button type="button" className="mini-add" onClick={() => add(g.key)} aria-label={`${g.label} 항목 추가`}>
                    <Icon name="plus" size={14} stroke={2.2} /> 추가
                  </button>
                  <span className="grow" />
                  <span className="group-sum">
                    공급가 <b>{won(gt.supply)}</b> · VAT <b>{won(gt.vat)}</b>
                  </span>
                </div>
                {rows.map(({ c, cr }) => {
                  const isTotal = c.inputMode === "total" && c.taxType === "taxable";
                  return (
                    <div key={c.id} className={`gt-row cgrid ${g.key === "overseas" && c.inCustomsValue && c.taxType === "taxable" ? "warn-row" : ""}`}>
                      <div className="name-cell">
                        <TextInput label="항목명" value={c.name} placeholder="항목명" onChange={(v) => setCost(c.id, { name: v })} />
                        <div className="name-sub">
                          <input className="note-input" aria-label="메모" value={c.note} placeholder="메모" onChange={(e) => setCost(c.id, { note: e.target.value })} />
                          {g.key === "overseas" && (
                            <label className="chk" title="세관 과세가격(CIF)에 포함되는 비용 — 운임·EXW·보험료. 관세·수입부가세 자동 계산에 사용">
                              <input type="checkbox" checked={c.inCustomsValue} onChange={(e) => setCost(c.id, { inCustomsValue: e.target.checked })} />
                              관세 기준(CIF) 포함
                            </label>
                          )}
                        </div>
                      </div>
                      <div>
                        <Seg
                          label="입력 기준"
                          value={c.taxType === "exempt" ? "supply" : c.inputMode}
                          options={MODE_OPTS}
                          onChange={(v) => setCost(c.id, { inputMode: v, taxType: v === "total" ? "taxable" : c.taxType })}
                        />
                      </div>
                      <div>
                        <NumInput label="금액" value={c.inputAmount} highlight={isTotal} onChange={(v) => setCost(c.id, { inputAmount: v })} />
                      </div>
                      <div>
                        <Select label="통화" value={c.currency} options={CURRENCIES} onChange={(v) => setCost(c.id, { currency: v })} />
                      </div>
                      <div>
                        <NumInput label="환율" value={c.fxRate} locked={c.currency === "KRW"} onChange={(v) => setCost(c.id, { fxRate: v })} />
                      </div>
                      <div>
                        <Seg label="세금계산서 VAT" value={c.taxType} options={TAX_OPTS} onChange={(v) => setCost(c.id, { taxType: v })} />
                      </div>
                      <div className={`num ${isTotal ? "calc" : "strong-soft"}`} title={isTotal ? `${won(cr.total)} ÷ 1.1 = ${won(cr.supply)}` : undefined}>
                        {won(cr.supply)}
                      </div>
                      <div className="num calc" title={c.taxType === "taxable" && !isTotal ? `${won(cr.supply)} × 10%` : undefined}>
                        {won(cr.vat)}
                      </div>
                      <div className={`num ${isTotal ? "strong-soft" : "calc"}`}>{won(cr.total)}</div>
                      <div>
                        <RowDelete label="비용 삭제" onClick={() => set("costs", s.costs.filter((x) => x.id !== c.id))} />
                      </div>
                      {g.key === "overseas" && c.inCustomsValue && c.taxType === "taxable" && (
                        <div className="row-warn" role="alert">
                          <Icon name="alert" size={13} stroke={2.2} />
                          <span>
                            관세 기준(CIF)에 포함된 비용에 VAT 10%를 넣으면 <b>수입부가세와 중복</b>될 수 있습니다. 해외 운임·EXW·보험료 세금계산서는 보통 영세율(VAT 없음)입니다.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="cost-sum">
        <div className="cost-sum-title">부대비용 합계</div>
        <div className="scroll-x">
          <table className="cost-sum-table">
            <thead>
              <tr>
                <th scope="col">구분</th>
                <th scope="col" className="num">건수</th>
                <th scope="col" className="num">공급가</th>
                <th scope="col" className="num">VAT</th>
                <th scope="col" className="num">합계 (VAT 포함)</th>
              </tr>
            </thead>
            <tbody>
              {COST_GROUPS.map((g) => {
                const gt = r.groups[g.key];
                return (
                  <tr key={g.key}>
                    <th scope="row">{g.label}</th>
                    <td className="num calc">{gt.count}건</td>
                    <td className="num">{won(gt.supply)}</td>
                    <td className="num">{won(gt.vat)}</td>
                    <td className="num">{won(gt.total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">합계</th>
                <td className="num calc">{s.costs.length}건</td>
                <td className="num">{won(r.totals.costSupply)}</td>
                <td className="num">{won(r.totals.costVat)}</td>
                <td className="num">{won(r.totals.costTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <ul className="cost-sum-notes">
          <li>
            <b>공급가 {won(r.totals.costSupply)}원</b> — 품목별로 배분되어 개당 매입가(원가)에 들어가는 금액
          </li>
          <li>
            <b>VAT {won(r.totals.costVat)}원</b> — {s.settings.vatDeductible ? "매입세액 공제로 환급 · 원가 제외 (필요자금에만 포함)" : "미공제 설정 · 원가에 포함"}
          </li>
          <li>
            <b>합계 {won(r.totals.costTotal)}원</b> — 물류업체·관세사에 실제로 지급하는 금액
          </li>
        </ul>
      </div>
    </section>
  );
}

function RowDelete({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="row-del" aria-label={label} title={label} onClick={onClick}>
      <Icon name="x" size={15} />
    </button>
  );
}

/* ================= ③ 설정 ================= */
function SettingsSection({ s, set }: { s: Shipment; set: SetFn }) {
  const st = s.settings;
  const up = (p: Partial<Shipment["settings"]>) => set("settings", { ...st, ...p });
  return (
    <section className="card pad" aria-label="계산 설정">
      <SectionHead n={3} title="계산 설정" />
      <div className="settings-grid">
        <div className="setting">
          <span className="setting-k">부가세 공제</span>
          <div className="cell-flex">
            <Toggle label="부가세 공제" checked={st.vatDeductible} onChange={(v) => up({ vatDeductible: v })} />
            <span className="setting-v">{st.vatDeductible ? "켬 · 공제 — 부가세를 원가에서 뺌" : "끔 · 미공제 — 부가세를 원가에 더함"}</span>
          </div>
        </div>
        <div className="setting">
          <span className="setting-k">보수적 원가 가산율</span>
          <div className="cell-flex">
            <NumInput label="보수적 원가 가산율" value={st.markupRate} digits={2} width={80} onChange={(v) => up({ markupRate: v })} />
            <span className="unit">%</span>
          </div>
        </div>
        <div className="setting">
          <span className="setting-k">단가 올림 단위</span>
          <Seg
            label="단가 올림 단위"
            value={st.roundUnit}
            onChange={(v) => up({ roundUnit: v })}
            options={[
              { value: 1, label: "1원" },
              { value: 10, label: "10원" },
              { value: 100, label: "100원" },
            ]}
          />
        </div>
        <div className="setting">
          <span className="setting-k">부대비 배분 기준</span>
          <Seg
            label="부대비 배분 기준"
            value={st.allocBasis}
            onChange={(v) => up({ allocBasis: v })}
            options={[
              { value: "value", label: "상품금액" },
              { value: "qty", label: "수량" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
