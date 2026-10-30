"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";

// Firebase 웹 설정값은 공개되어도 되는 값입니다 (보안은 firestore.rules 로 지킵니다).
// 환경변수(NEXT_PUBLIC_FIREBASE_*)가 있으면 그 값을, 없으면 아래 기본값(psfa-meeting)을 씁니다.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB-JlMs_PTO-iyBrIzGXCPFVkJFOUfD9ME",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "psfa-meeting.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "psfa-meeting",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "psfa-meeting.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "824178871506",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:824178871506:web:30cba7c14bd5759b78310b",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-79HS037T46",
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

export function firebaseApp(): FirebaseApp {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function auth(): Auth {
  return getAuth(firebaseApp());
}

export function firestore(): Firestore {
  if (!db) {
    try {
      db = initializeFirestore(firebaseApp(), { ignoreUndefinedProperties: true });
    } catch {
      db = getFirestore(firebaseApp());
    }
  }
  return db;
}

export const googleProvider = new GoogleAuthProvider();
