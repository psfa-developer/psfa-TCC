"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";

export function LoginGate({ children }: { children: ReactNode }) {
  const { user, loading, login } = useAuth();
  const [err, setErr] = useState("");

  if (loading) return <div className="center-msg">불러오는 중…</div>;
  if (user) return <>{children}</>;

  return (
    <main className="login">
      <div className="login-card">
        <div className="logo">TC</div>
        <h1>Trade Cost Calculator</h1>
        <p>수입 건별 원가를 계산하고 저장합니다.</p>
        {err && <div className="error-box">{err}</div>}
        <button
          type="button"
          className="btn primary"
          onClick={async () => {
            setErr("");
            try {
              await login();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "로그인에 실패했습니다.");
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
            <path fill="#fff" opacity=".85" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
            <path fill="#fff" opacity=".7" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" />
            <path fill="#fff" opacity=".55" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" />
          </svg>
          Google 계정으로 로그인
        </button>
      </div>
    </main>
  );
}
