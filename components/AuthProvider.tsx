"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value: AuthState = {
    user,
    loading,
    login: async () => {
      const desktop = typeof window !== "undefined" ? window.tccDesktop : undefined;
      if (desktop) {
        // EXE 앱: Google 은 앱 내장 창에서의 로그인을 막으므로 기본 브라우저에서 로그인한 뒤 토큰을 넘겨받습니다.
        const { idToken, accessToken } = await desktop.login();
        if (!idToken && !accessToken) throw new Error("로그인이 취소되었습니다.");
        await signInWithCredential(auth(), GoogleAuthProvider.credential(idToken, accessToken));
        return;
      }
      await signInWithPopup(auth(), googleProvider);
    },
    logout: async () => {
      await signOut(auth());
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
