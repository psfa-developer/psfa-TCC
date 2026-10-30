"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LoginGate } from "@/components/LoginGate";
import { useConfirm } from "@/components/Confirm";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/ui";
import { calculate } from "@/lib/calc";
import { timeAgo, won } from "@/lib/format";
import { emptyShipment, sampleShipment, uid } from "@/lib/sample";
import { createShipment, deleteShipment, listShipments } from "@/lib/shipments";
import type { Shipment, ShipmentDoc } from "@/lib/types";

export default function Home() {
  return (
    <LoginGate>
      <ShipmentList />
    </LoginGate>
  );
}

function ShipmentList() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const [list, setList] = useState<ShipmentDoc[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setList(await listShipments(user.uid));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setList([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (data: Shipment) => {
    if (!user) return;
    setBusy(true);
    try {
      const id = await createShipment(user.uid, data);
      router.push(`/shipments/${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const duplicate = (s: ShipmentDoc) => {
    const { id: _id, updatedAt: _u, ...rest } = s;
    void _id;
    void _u;
    create({
      ...rest,
      title: `${s.title} (복사본)`,
      status: "estimate",
      items: rest.items.map((it) => ({ ...it, id: uid() })),
      costs: rest.costs.map((c) => ({ ...c, id: uid() })),
    });
  };

  const remove = async (s: ShipmentDoc) => {
    if (!user || s.status === "confirmed") return;
    const ok = await confirm({
      title: "수입 건을 삭제할까요?",
      message: (
        <>
          <b>{s.title || "제목 없음"}</b>
          {s.blNo ? ` (B/L ${s.blNo})` : ""}
          <br />
          삭제하면 되돌릴 수 없습니다.
        </>
      ),
      confirmText: "삭제",
      tone: "danger",
    });
    if (!ok) return;
    await deleteShipment(user.uid, s.id);
    load();
  };

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="list-head">
          <div className="grow">
            <h1>수입 건</h1>
            <p>수입 건마다 상품·부대비용을 입력하면 품목별 개당 매입가가 계산됩니다.</p>
          </div>
          <button type="button" className="btn" disabled={busy} onClick={() => create(sampleShipment())}>
            <Icon name="file" /> 예시 불러오기 (CSE260666)
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => create(emptyShipment())}>
            <Icon name="plus" stroke={2.2} /> 새 수입 건
          </button>
        </div>

        {err && (
          <div className="error-box">
            {err.includes("permission") || err.includes("PERMISSION")
              ? "Firestore 접근 권한이 없습니다. Firebase 콘솔에서 보안 규칙(firestore.rules)을 적용했는지 확인하세요."
              : err}
          </div>
        )}

        {list === null ? (
          <div className="center-msg">불러오는 중…</div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <h2>아직 수입 건이 없습니다</h2>
            <p>새로 만들거나, 지난 해상 수입 실적(CSE260666)을 예시로 불러와 보세요.</p>
            <div className="row">
              <button type="button" className="btn" disabled={busy} onClick={() => create(sampleShipment())}>
                예시 불러오기
              </button>
              <button type="button" className="btn primary" disabled={busy} onClick={() => create(emptyShipment())}>
                새 수입 건
              </button>
            </div>
          </div>
        ) : (
          <div className="ship-grid">
            {list.map((s) => {
              const r = calculate(s);
              return (
                <div key={s.id} className="ship-card">
                  <Link href={`/shipments/${s.id}`} style={{ color: "inherit", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="ship-card-top">
                      <div className="grow">
                        <h3>{s.title || "제목 없음"}</h3>
                        <div className="meta-line">
                          {s.blNo ? `B/L ${s.blNo}` : "B/L 미입력"}
                          {s.arrivalDate ? ` · 입항 ${s.arrivalDate}` : ""}
                        </div>
                      </div>
                      <span className={`status ${s.status}`}>{s.status === "confirmed" ? "확정" : "견적"}</span>
                    </div>
                    <div className="kv">
                      <span>품목</span>
                      <b>{s.items.length}개</b>
                    </div>
                    <div className="kv">
                      <span>총 매입가</span>
                      <b>{won(r.totals.landed)}원</b>
                    </div>
                    <div className="kv">
                      <span>필요자금</span>
                      <b>{won(r.totals.cash)}원</b>
                    </div>
                  </Link>
                  <div className="actions">
                    <span className="grow meta-line" style={{ fontSize: 12, color: "var(--text-3)", alignSelf: "center" }}>
                      {timeAgo(s.updatedAt)}
                    </span>
                    <button type="button" className="icon-btn" aria-label="복제" title="복제해서 새 견적 만들기" onClick={() => duplicate(s)}>
                      <Icon name="copy" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="삭제"
                      title={s.status === "confirmed" ? "확정된 건은 삭제할 수 없습니다. 견적으로 바꾼 뒤 삭제하세요." : "삭제"}
                      disabled={s.status === "confirmed"}
                      onClick={() => remove(s)}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
