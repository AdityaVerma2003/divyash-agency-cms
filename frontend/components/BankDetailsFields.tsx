"use client";

import { IFSC_REGEX, type BankDetails } from "@/lib/bankDetails";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 transition-colors";

interface Props {
  value: BankDetails;
  onChange: (next: BankDetails) => void;
  required?: boolean;
}

export default function BankDetailsFields({ value, onChange, required }: Props) {
  function set<K extends keyof BankDetails>(key: K, v: string) {
    onChange({ ...value, [key]: v });
  }

  const ifscInvalid = value.ifsc.trim() !== "" && !IFSC_REGEX.test(value.ifsc.trim().toUpperCase());

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--muted)]">
          Account holder name {required && <span className="text-danger">*</span>}
        </span>
        <input
          type="text"
          required={required}
          value={value.accountHolderName}
          onChange={(e) => set("accountHolderName", e.target.value)}
          className={inputCls}
          placeholder="As per bank records"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--muted)]">
          Bank name {required && <span className="text-danger">*</span>}
        </span>
        <input
          type="text"
          required={required}
          value={value.bankName}
          onChange={(e) => set("bankName", e.target.value)}
          className={inputCls}
          placeholder="e.g. HDFC Bank"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--muted)]">
          Account number {required && <span className="text-danger">*</span>}
        </span>
        <input
          type="text"
          inputMode="numeric"
          required={required}
          value={value.accountNumber}
          onChange={(e) => set("accountNumber", e.target.value.replace(/[^0-9]/g, ""))}
          className={inputCls}
          placeholder="1234567890"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--muted)]">
          IFSC code {required && <span className="text-danger">*</span>}
        </span>
        <input
          type="text"
          required={required}
          value={value.ifsc}
          onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
          className={inputCls}
          placeholder="HDFC0001234"
          maxLength={11}
        />
        {ifscInvalid && <p className="mt-1 text-xs text-danger">Invalid IFSC format (e.g. HDFC0001234)</p>}
      </label>
    </div>
  );
}
