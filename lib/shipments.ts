"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "./firebase";
import { emptyShipment } from "./sample";
import type { Shipment, ShipmentDoc } from "./types";

const col = (uid: string) => collection(firestore(), "users", uid, "shipments");

/** 저장된 문서를 현재 스키마에 맞춰 보정 (필드 누락 대비) */
function normalize(id: string, data: Record<string, unknown>): ShipmentDoc {
  const base = emptyShipment();
  const ts = data.updatedAt as Timestamp | undefined;
  return {
    ...base,
    ...(data as unknown as Partial<Shipment>),
    importVat: { ...base.importVat, ...((data.importVat as object) ?? {}) },
    settings: { ...base.settings, ...((data.settings as object) ?? {}) },
    items: (data.items as Shipment["items"]) ?? [],
    costs: (data.costs as Shipment["costs"]) ?? [],
    id,
    updatedAt: ts && typeof ts.toMillis === "function" ? ts.toMillis() : undefined,
  };
}

export async function listShipments(uid: string): Promise<ShipmentDoc[]> {
  const snap = await getDocs(query(col(uid), orderBy("updatedAt", "desc")));
  return snap.docs.map((d) => normalize(d.id, d.data()));
}

export async function getShipment(uid: string, id: string): Promise<ShipmentDoc | null> {
  const snap = await getDoc(doc(col(uid), id));
  return snap.exists() ? normalize(snap.id, snap.data()) : null;
}

export async function createShipment(uid: string, data: Shipment): Promise<string> {
  const ref = await addDoc(col(uid), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function saveShipment(uid: string, id: string, data: Shipment): Promise<void> {
  const { ...plain } = data as Shipment & { id?: string; updatedAt?: number };
  delete plain.id;
  delete plain.updatedAt;
  await setDoc(doc(col(uid), id), { ...plain, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteShipment(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(col(uid), id));
}
