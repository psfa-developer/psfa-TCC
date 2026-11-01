"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

/**
 * EXE 앱 전용 로그인 페이지 (기본 브라우저에서 열림).
 * Google 로그인 후 토큰을 이 PC의 앱(127.0.0.1 루프백 주소)으로만 넘깁니다.
 */
export default function DesktopLoginPage() {
  const [params, setParams] = useState<{ port: number; state: string } | null>(null);
  const [phase, setPhase] = useState<"ready" | "working" | "done" | "error">("ready");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const port = Number(q.get("port"));
    const state = q.get("state") ?? "";
    // 루프백 포트·state 형식 검증 (다른 주소로 토큰이 넘어가지 않도록)
    if (Number.isInteger(port) && port >= 1024 && port <= 65535 && /^[A-Za-z0-9_-]{16,128}$/.test(state)) {
      setParams({ port, state });
    } else {
      setPhase("error");
      setMsg("잘못된 접근입니다. TCC 앱에서 로그인 버튼을 다시 눌러주세요.");
    }
  }, []);

  const start = async () => {
    if (!params) return;
    setPhase("working");
    setMsg("");
    try {
      const result = await signInWithPopup(auth(), googleProvider);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (!cred?.idToken && !cred?.accessToken) throw new Error("Google 인증 정보를 받지 못했습니다.");
      const u = new URL(`http://127.0.0.1:${params.port}/callback`);
      u.searchParams.set("state", params.state);
      if (cred.idToken) u.searchParams.set("idToken", cred.idToken);
      if (cred.accessToken) u.searchParams.set("accessToken", cred.accessToken);
      setPhase("done");
      window.location.replace(u.toString());
    } catch (e) {
      setPhase("error");
      setMsg(e instanceof Error ? e.message : "로그인에 실패했습니다.");
    }
  };

  return (
    <main className="login">
      <div className="login-card">
        <div className="logo">TC</div>
        <h1>TCC 데스크톱 앱 로그인</h1>
        {phase === "done" ? (
          <p>로그인 정보를 앱으로 보내는 중입니다…</p>
        ) : (
          <>
            <p>Google 계정으로 로그인하면 TCC 앱으로 자동으로 돌아갑니다.</p>
            {msg && <div className="error-box">{msg}</div>}
            <button type="button" className="btn primary" disabled={!params || phase === "working"} onClick={start}>
              {phase === "working" ? "로그인 중…" : "Google 계정으로 로그인"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
