"use client";

import { useState, type ReactNode } from "react";
import { inputFmt, parseNum } from "@/lib/format";

/* ---------- 숫자 입력: 포커스 아웃 시 천 단위 쉼표 ---------- */
export function NumInput({
  value,
  onChange,
  label,
  digits = 6,
  locked = false,
  highlight = false,
  width,
  className = "",
}: {
  value: number;
  onChange?: (v: number) => void;
  label: string;
  digits?: number;
  locked?: boolean;
  highlight?: boolean;
  width?: number | string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? inputFmt(value, digits) : "");
  return (
    <input
      className={`inp r ${locked ? "lock" : ""} ${highlight ? "hl" : ""} ${className}`}
      style={width ? { width } : undefined}
      aria-label={label}
      inputMode="decimal"
      value={shown}
      placeholder="0"
      readOnly={locked}
      tabIndex={locked ? -1 : undefined}
      onFocus={(e) => {
        if (locked) return;
        setDraft(value ? String(value) : "");
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => {
        const s = e.target.value.replace(/[^\d.,-]/g, "");
        setDraft(s);
        onChange?.(parseNum(s));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export function TextInput({
  value,
  onChange,
  label,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      className={`inp ${className}`}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* ---------- 세그먼트 버튼 ---------- */
export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
  accent = true,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? (accent ? "on tx" : "on") : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  width,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label: string;
  width?: number;
}) {
  return (
    <select className="inp sel" aria-label={label} value={value} style={width ? { width } : undefined} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

/* ---------- 아이콘 (stroke SVG) ---------- */
const paths: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6 9 17l-5-5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  print: (
    <>
      <path d="M6 9V3h12v6" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
      <path d="M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2 21h20L12 3z" />
      <path d="M12 10v4M12 18h.01" />
    </>
  ),
  logout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" />,
  file: <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />,
  arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
  home: <path d="M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
};

export function Icon({ name, size = 16, stroke = 1.9 }: { name: keyof typeof paths | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
