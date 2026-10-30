"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Editor } from "@/components/Editor";
import { LoginGate } from "@/components/LoginGate";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/ui";
import { StatusToggle, nextStatus } from "@/components/StatusToggle";
import { useConfirm } from "@/components/Confirm";
import { downloadExcel } from "@/lib/excel";
import { getShipment, saveShipment } from "@/lib/shipments";
import type { Shipment } from "@/lib/types";

export default function ShipmentPage() {
  return (
    <LoginGate>
      <ShipmentEditor />
    </LoginGate>
  );
}

type SaveState = "idle" | "saving" | "saved" | "error";

function ShipmentEditor() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [data, setData] = useState<Shipment | null>(null);
  const [missing, setMissing] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [exporting, setExporting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Shipment | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    getShipment(user.uid, id)
      .then((d) => {
        if (!d) setMissing(true);
        else {
          const { id: _id, updatedAt: _u, ...rest } = d;
          void _id;
          void _u;
          setData(rest);
          setSave("saved");
        }
      })
      .catch(() => setMissing(true));
  }, [user, id]);

  const flush = async () => {
    if (!user || !latest.current) return;
    const snapshot = latest.current;
    try {
      await saveShipment(user.uid, id, snapshot);
      if (latest.current === snapshot) setSave("saved");
    } catch {
      setSave("error");
    }
  };

  const onChange = (next: Shipment, opts?: { immediate?: boolean }) => {
    setData(next);
    latest.current = next;
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    if (opts?.immediate) flush();
    else timer.current = setTimeout(flush, 700);
  };

  // 페이지를 떠나기 전 저장되지 않은 변경 경고
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (save === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [save]);

  const saveLabel =
    save === "saving" ? "저장 중…" : save === "error" ? "저장 실패 · 다시 시도" : save === "saved" ? "저장됨" : "";

  return (
    <>
      <TopBar
        crumb={data?.blNo || data?.title || "수입 건"}
        right={
          data && (
            <>
              <StatusToggle
                status={data.status}
                onToggle={async () => {
                  const next = await nextStatus(data, confirm);
                  if (next) onChange(next, { immediate: true });
                }}
              />
              <button
                type="button"
                className={`save-state ${save === "saved" ? "ok" : save === "error" ? "err" : ""}`}
                style={{ border: 0, background: "transparent", cursor: save === "error" ? "pointer" : "default" }}
                onClick={() => save === "error" && flush()}
                aria-live="polite"
              >
                {save === "saved" && <Icon name="check" stroke={2.2} />}
                {save === "error" && <Icon name="alert" />}
                {saveLabel}
              </button>
              <button type="button" className="btn" onClick={() => window.print()}>
                <Icon name="print" /> 인쇄
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={exporting}
                onClick={async () => {
                  setExporting(true);
                  try {
                    await downloadExcel(data);
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                <Icon name="download" /> {exporting ? "만드는 중…" : "엑셀 다운로드"}
              </button>
            </>
          )
        }
      />
      <main className="page">
        {missing ? (
          <div className="empty-state">
            <h2>수입 건을 찾을 수 없습니다</h2>
            <p>삭제되었거나 다른 계정의 수입 건입니다.</p>
          </div>
        ) : !data ? (
          <div className="center-msg">불러오는 중…</div>
        ) : (
          <Editor value={data} onChange={onChange} />
        )}
      </main>
    </>
  );
}
