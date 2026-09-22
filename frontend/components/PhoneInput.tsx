"use client";

interface CountryCode {
  code: string;   // dial code, e.g. "+91"
  flag: string;
  name: string;
  maxDigits: number;  // expected national number length
}

const COUNTRIES: CountryCode[] = [
  { code: "+91",  flag: "🇮🇳", name: "India",          maxDigits: 10 },
  { code: "+1",   flag: "🇺🇸", name: "USA / Canada",   maxDigits: 10 },
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom", maxDigits: 10 },
  { code: "+61",  flag: "🇦🇺", name: "Australia",      maxDigits: 9  },
  { code: "+971", flag: "🇦🇪", name: "UAE",            maxDigits: 9  },
  { code: "+65",  flag: "🇸🇬", name: "Singapore",      maxDigits: 8  },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia",       maxDigits: 9  },
  { code: "+49",  flag: "🇩🇪", name: "Germany",        maxDigits: 11 },
];

interface PhoneInputProps {
  value: string;              // stored as full string e.g. "+91 9876543210"
  onChange: (v: string) => void;
  onInvalidPaste?: () => void;  // called when pasted text contains non-digits
  className?: string;
  error?: boolean;
}

function parseValue(value: string): { dialCode: string; national: string } {
  for (const c of COUNTRIES) {
    if (value.startsWith(c.code + " ")) {
      return { dialCode: c.code, national: value.slice(c.code.length + 1) };
    }
    if (value.startsWith(c.code)) {
      return { dialCode: c.code, national: value.slice(c.code.length) };
    }
  }
  return { dialCode: "+91", national: value };
}

export default function PhoneInput({
  value,
  onChange,
  onInvalidPaste,
  className = "",
  error = false,
}: PhoneInputProps) {
  const { dialCode, national } = parseValue(value);
  const country = COUNTRIES.find((c) => c.code === dialCode) ?? COUNTRIES[0];

  function setDialCode(code: string) {
    onChange(code + (national ? " " + national : ""));
  }

  function setNational(raw: string) {
    // Strip non-digits in real time
    const digits = raw.replace(/\D/g, "");
    onChange(dialCode + (digits ? " " + digits : ""));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (/\D/.test(pasted.replace(/[\s\-()]/g, ""))) {
      // Contains non-digit, non-formatting chars → reject and notify
      e.preventDefault();
      onInvalidPaste?.();
      return;
    }
    // Let the browser handle the paste — setNational will clean it up via onChange
  }

  const baseInput = [
    "flex-1 rounded-r-xl border-y border-r border-[var(--border)] bg-[var(--surface)]",
    "px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]",
    "outline-none focus:border-coral-500 transition-colors",
    error ? "border-red-400 dark:border-red-500" : "",
    className,
  ].join(" ");

  return (
    <div className="flex">
      {/* Country code selector */}
      <select
        value={dialCode}
        onChange={(e) => setDialCode(e.target.value)}
        className={[
          "flex-shrink-0 rounded-l-xl border border-[var(--border)] bg-[var(--surface)]",
          "pl-2.5 pr-7 py-2.5 text-sm text-[var(--ink)] outline-none",
          "focus:border-coral-500 transition-colors appearance-none",
          "border-r-0 cursor-pointer",
          error ? "border-red-400 dark:border-red-500" : "",
        ].join(" ")}
        style={{ backgroundImage: "none" }}
        aria-label="Country code"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>

      {/* Divider */}
      <div className={`flex-shrink-0 border-y ${error ? "border-red-400 dark:border-red-500" : "border-[var(--border)]"} bg-[var(--surface)] flex items-center px-1`}>
        <div className="h-4 w-px bg-[var(--border)]" />
      </div>

      {/* National number */}
      <input
        type="tel"
        inputMode="numeric"
        value={national}
        onChange={(e) => setNational(e.target.value)}
        onPaste={handlePaste}
        placeholder={`${country.maxDigits} digits`}
        maxLength={country.maxDigits}
        className={baseInput}
        aria-label="Phone number"
      />
    </div>
  );
}

/** Validate a full phone value like "+91 9876543210" */
export function validatePhone(value: string): string | null {
  if (!value || value === "") return null; // optional field
  const { dialCode, national } = parseValue(value);
  const country = COUNTRIES.find((c) => c.code === dialCode);
  if (!national) return null; // empty is fine (optional)
  const digits = national.replace(/\D/g, "");
  if (!digits) return null;
  if (country && digits.length !== country.maxDigits) {
    return `Phone number should be ${country.maxDigits} digits for ${country.name}`;
  }
  if (!/^\d+$/.test(digits)) return "Phone number must contain only digits";
  return null;
}
