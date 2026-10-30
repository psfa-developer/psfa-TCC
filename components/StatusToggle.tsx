"use client";

import type { Shipment } from "@/lib/types";
import { Icon } from "./ui";
import type { ConfirmOptions } from "./Confirm";

type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;

/** 확정 ↔ 견적 토글 (상단 메뉴바용) */
export function StatusToggle({ status, onToggle }: { status: Shipment["status"]; onToggle: () => void }) {
  const locked = status === "confirmed";
  return (
    <div
      className={`status-bar compact in-topbar ${locked ? "is-locked" : "is-editing"}`}
      role="status"
      title={locked ? "확정된 수입 건은 수정할 수 없습니다. 수정하려면 견적으로 바꾸세요." : "입력이 끝나면 확정으로 저장하세요. 확정하면 수정이 잠깁니다."}
    >
      <Icon name={locked ? "lock" : "pencil"} size={16} />
      <span className="status-text">
        <b>{locked ? "확정된 수입 건" : "견적 작성 중"}</b>
        <span>{locked ? "수정하려면 견적으로 바꾸세요" : "확정하면 수정이 잠깁니다"}</span>
      </span>
      <button type="button" className={`btn status-toggle ${locked ? "" : "primary"}`} aria-pressed={locked} onClick={onToggle}>
        <Icon name={locked ? "pencil" : "check"} stroke={2.1} />
        {locked ? "견적으로 바꾸고 수정" : "확정으로 저장"}
      </button>
    </div>
  );
}

/** 상태 전환 규칙: 견적으로 바꿀 때만 확인창 */
export async function nextStatus(s: Shipment, confirm: ConfirmFn): Promise<Shipment | null> {
  if (s.status === "confirmed") {
    const ok = await confirm({
      title: "견적으로 바꿀까요?",
      message: "확정을 해제하면 내용을 수정할 수 있습니다. 수정이 끝나면 다시 확정으로 저장하세요.",
      confirmText: "견적으로 바꾸기",
      icon: "pencil",
    });
    return ok ? { ...s, status: "estimate" } : null;
  }
  return { ...s, status: "confirmed" };
}
