export const INPUT_CLS =
  "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-coral-500 border-[var(--border)]";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

export function SubmitRow({ submitting, error }: { submitting: boolean; error: string | null }) {
  return (
    <div className="flex items-center justify-between pt-1">
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="ml-auto rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Add entry"}
      </button>
    </div>
  );
}
