export const CURRENCIES = ["KRW", "EUR", "USD", "JPY", "CNY", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const VOLUME_UNITS = ["ml", "L", "g", "kg", "ea"] as const;
export type VolumeUnit = (typeof VOLUME_UNITS)[number];

export type TaxType = "taxable" | "exempt";
export type InputMode = "supply" | "total";
export type CostGroup = "overseas" | "customs" | "domestic";
export type AllocBasis = "value" | "qty";
export type ShipmentStatus = "estimate" | "confirmed";

export const COST_GROUPS: { key: CostGroup; label: string }[] = [
  { key: "overseas", label: "해외 비용" },
  { key: "customs", label: "통관 수수료" },
  { key: "domestic", label: "국내 물류" },
];

/** 상품 행 */
export interface Item {
  id: string;
  name: string;
  volume: number;
  volumeUnit: VolumeUnit;
  qty: number;
  /** 개당 원가 (해당 통화) */
  unitPrice: number;
  currency: Currency;
  /** 원/통화 환율 — 송금 환율 */
  fxRate: number;
  /** 관세율 % (예: 8 → 8%) */
  dutyRate: number;
  /** 수입부가세 과세 여부 */
  taxType: TaxType;
}

/** 부대비용 행 */
export interface CostLine {
  id: string;
  group: CostGroup;
  name: string;
  note: string;
  currency: Currency;
  fxRate: number;
  taxType: TaxType;
  /** 사용자가 공급가를 입력했는지 합계를 입력했는지 */
  inputMode: InputMode;
  /** 사용자가 입력한 원래 금액 (해당 통화) */
  inputAmount: number;
  /** 관세 과세가격(CIF)에 포함되는 비용 — 운임·EXW·보험료 */
  inCustomsValue: boolean;
}

export interface ImportVatSetting {
  /** auto = 과세가격×10% 자동 계산, manual = 세관 고지액 입력 */
  mode: "auto" | "manual";
  /** 통관 환율 (수입신고필증 적용환율) */
  customsFxRate: number;
  /** 세관 고지액 */
  manualKrw: number;
}

export interface Settings {
  vatDeductible: boolean;
  /** 보수적 원가 가산율 % */
  markupRate: number;
  /** 단가 올림 단위 (원) */
  roundUnit: number;
  allocBasis: AllocBasis;
}

export interface Shipment {
  title: string;
  blNo: string;
  arrivalDate: string;
  supplier: string;
  memo: string;
  status: ShipmentStatus;
  items: Item[];
  costs: CostLine[];
  importVat: ImportVatSetting;
  settings: Settings;
  /** 관세사 정산서 총액 (대조용, 0이면 대조 안 함) */
  settlementTotal: number;
}

export interface ShipmentDoc extends Shipment {
  id: string;
  updatedAt?: number;
}
