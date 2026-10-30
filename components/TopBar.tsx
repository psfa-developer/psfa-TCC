"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { Icon } from "./ui";

export function TopBar({ crumb, right }: { crumb?: string; right?: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">
          <span className="logo">TC</span>
          Trade Cost Calculator
        </Link>
        {crumb && (
          <nav className="crumbs" aria-label="경로">
            <Link href="/">수입 건</Link>
            <span aria-hidden="true">/</span>
            <b>{crumb}</b>
          </nav>
        )}
        <span className="grow" />
        {right}
        {user && (
          <div className="account">
            <div className="account-who" title={user.email ?? undefined}>
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="account-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="account-avatar fallback" aria-hidden="true">
                  {(user.displayName || user.email || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="account-text">
                <b>{user.displayName || "사용자"}</b>
                <span>{user.email}</span>
              </span>
            </div>
            <button type="button" className="account-logout" onClick={() => setOpen(true)} aria-haspopup="dialog" title="로그아웃">
              <Icon name="logout" size={17} stroke={2.1} />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>
      {open && user && <AccountDialog email={user.email} onClose={() => setOpen(false)} onLogout={logout} />}
    </header>
  );
}

function AccountDialog({ email, onClose, onLogout }: { email: string | null; onClose: () => void; onLogout: () => Promise<void> }) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <div className="modal-icon danger">
          <Icon name="logout" size={20} stroke={2} />
        </div>
        <h2 id="account-title">로그아웃할까요?</h2>
        <div className="modal-msg">{email ? `${email} 계정에서 로그아웃합니다.` : "현재 계정에서 로그아웃합니다."}</div>
        <div className="modal-actions three">
          {!isHome && (
            <button
              type="button"
              className="btn modal-home"
              onClick={() => {
                onClose();
                router.push("/");
              }}
            >
              <Icon name="home" /> 홈으로 가기
            </button>
          )}
          <span className="grow" />
          <button ref={cancelRef} type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btn danger-solid"
            onClick={async () => {
              onClose();
              await onLogout();
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
