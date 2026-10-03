// Bank details are stored server-side as a single JSON-encoded string in
// User.bankDetails (no schema change needed) — these helpers are the one
// place that (de)serializes it, so every reader/writer agrees on the shape.

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
}

export const EMPTY_BANK_DETAILS: BankDetails = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
};

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function parseBankDetails(raw?: string | null): BankDetails | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const d: BankDetails = {
      accountHolderName: typeof parsed.accountHolderName === "string" ? parsed.accountHolderName : "",
      bankName: typeof parsed.bankName === "string" ? parsed.bankName : "",
      accountNumber: typeof parsed.accountNumber === "string" ? parsed.accountNumber : "",
      ifsc: typeof parsed.ifsc === "string" ? parsed.ifsc : "",
    };
    return Object.values(d).some(Boolean) ? d : null;
  } catch {
    return null;
  }
}

export function isBankDetailsFilled(d: BankDetails): boolean {
  return !!(d.accountHolderName.trim() && d.bankName.trim() && d.accountNumber.trim() && d.ifsc.trim());
}

/** Returns "" when nothing is filled in, so callers can send it unconditionally to clear the field. */
export function serializeBankDetails(d: BankDetails): string {
  const trimmed: BankDetails = {
    accountHolderName: d.accountHolderName.trim(),
    bankName: d.bankName.trim(),
    accountNumber: d.accountNumber.trim(),
    ifsc: d.ifsc.trim().toUpperCase(),
  };
  if (!Object.values(trimmed).some(Boolean)) return "";
  return JSON.stringify(trimmed);
}
