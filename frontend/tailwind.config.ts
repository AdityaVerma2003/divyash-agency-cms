import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)",    "system-ui", "sans-serif"],
        script:  ["var(--font-lavishly-yours)", "cursive"],
        // Portal-only face; `.portal-theme` applies it to the whole shell
        portal:  ["var(--font-inter)",   "system-ui", "sans-serif"],
      },
      colors: {
        // ── Landing page palette ─────────────────────────────────
        // Full 50…950 indigo ramp. The 200/300/800/900 steps were missing,
        // so existing `brand-800` / `brand-900` classes silently rendered nothing.
        coral: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",   // primary brand — indigo
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },
        cream: "#FFFBF9",     // warm light bg
        mint:  "#2DBFA0",     // geometric accent (teal)
        rose:  "#F87DA3",     // decorative blob accent
        sky:   "#5B7CF7",     // geometric accent (blue)

        // ── Portal tokens (admin / client dashboards) ────────────
        night:  "#0E141B",    // sidebar (always dark)
        canvas: "#FFFBF9",    // page bg (warm cream now)
        ink:    "#1C1410",    // primary text
        ash:    "#6B7280",    // secondary / muted

        // This overrides Tailwind's built-in slate. The 300/400/700/800/900
        // steps were missing, so `dark:bg-slate-800` rendered nothing.
        slate: {
          50:  "#ECEEF2",
          100: "#E4E7ED",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#6B7280",
          600: "#4B5563",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },

        // ── Brand → indigo (same ramp as `coral`) ────────────────
        brand: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },

        // ── Semantic ─────────────────────────────────────────────
        positive: "#059669",
        success:  "#059669",
        warning:  "#D97706",
        danger:   "#DC2626",
      },
      borderRadius: {
        card: "8px",
      },
      boxShadow: {
        "portal-xs": "0 1px 2px 0 rgba(16, 24, 40, 0.05)",
        "portal-sm": "0 1px 3px 0 rgba(16, 24, 40, 0.10)",
        "portal-md": "0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06)",
        "portal-lg": "0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)",
      },
      animation: {
        "float":         "float 6s ease-in-out infinite",
        "float-slow":    "float 9s ease-in-out infinite",
        "float-slower":  "float 12s ease-in-out infinite",
        "blob-spin":     "blobSpin 20s linear infinite",
        "fade-up":       "fadeUp 0.6s ease forwards",
        "marquee":       "marquee 45s linear infinite",
        "marquee-slow":  "marquee 60s linear infinite",
        "spin-slow":     "spin 14s linear infinite",
        "draw":          "draw 1.4s ease-out forwards",
        "wiggle":        "wiggle 2.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        blobSpin: {
          "0%":   { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "25%":  { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
          "50%":  { borderRadius: "50% 60% 30% 60% / 30% 40% 70% 50%" },
          "75%":  { borderRadius: "60% 40% 60% 30% / 70% 30% 50% 40%" },
          "100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Track holds the logo list twice, so -50% lands on an identical frame
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Pairs with strokeDasharray to draw an SVG path on
        draw: {
          "0%":   { strokeDashoffset: "260" },
          "100%": { strokeDashoffset: "0" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-4deg)" },
          "50%":      { transform: "rotate(4deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
