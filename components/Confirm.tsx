"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./ui";

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** danger = 삭제·로그아웃처럼 되돌리기 어려운 동작 */
  tone?: "default" | "danger";
  icon?: string;
}

type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<ConfirmFn>(async () => false);

/** 화면 정가운데에 뜨는 확인창. 브라우저 기본 confirm 대신 사용합니다. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  useEffect(() => {
    if (!opts) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts]);

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className={`modal-icon ${opts.tone === "danger" ? "danger" : ""}`}>
              <Icon name={opts.icon ?? (opts.tone === "danger" ? "alert" : "info")} size={20} stroke={2} />
            </div>
            <h2 id="confirm-title">{opts.title}</h2>
            {opts.message && <div className="modal-msg">{opts.message}</div>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => close(false)}>
                {opts.cancelText ?? "취소"}
              </button>
              <button ref={okRef} type="button" className={`btn ${opts.tone === "danger" ? "danger-solid" : "primary"}`} onClick={() => close(true)}>
                {opts.confirmText ?? "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
