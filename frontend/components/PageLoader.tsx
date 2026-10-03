"use client";

import LatticeLoader from "@/components/LatticeLoader";

interface PageLoaderProps {
  label?: string;
  /** Renders inline instead of as a centered block (for embedding inside a card/section) */
  inline?: boolean;
  /**
   * Full viewport height — use for standalone pages (no persistent layout chrome
   * around them). Portal pages (admin/client), which render inside PortalShell's
   * own scrollable content area, should pass false to avoid an oversized block.
   * @default true
   */
  fullScreen?: boolean;
}

/**
 * App-wide loading indicator (LatticeLoader from React Bits, adapted for this
 * app's theme) — used as the Next.js route-segment `loading.tsx` fallback so
 * every portal/page shows the same loading animation while it takes a beat to
 * load, instead of each page inventing its own.
 */
export default function PageLoader({ label = "Loading", inline = false, fullScreen = true }: PageLoaderProps) {
  const loader = (
    <LatticeLoader
      status="working"
      label={label}
      pattern="orbit"
      grid={3}
      shape="round"
      color="#6366F1"
      cellSize={7}
      gap={2.5}
      fontSize={14}
      step={90}
      idleOpacity={0.15}
      showTimer={false}
    />
  );

  if (inline) return loader;

  return (
    <div
      className={`flex w-full items-center justify-center ${fullScreen ? "min-h-screen" : "min-h-[50vh]"}`}
      style={{ background: "var(--page-bg)" }}
    >
      {loader}
    </div>
  );
}
