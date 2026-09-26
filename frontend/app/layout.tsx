import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora, Lavishly_Yours } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

// Script/handwritten display font — used sparingly for stylised name treatments
const lavishlyYours = Lavishly_Yours({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-lavishly-yours",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Divyash Digital — Delhi's Digital Growth Partner",
  description:
    "SEO, Social Media, Google Ads, Meta Ads, Web Design & Graphic Design — measurable results for businesses serious about growth.",
  icons: {
    icon: [{ url: "/logo.webp", type: "image/webp" }],
    shortcut: [{ url: "/logo.webp", type: "image/webp" }],
    apple: [{ url: "/logo.webp" }],
  },
};

const themeScript = `(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e){}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${sora.variable} ${lavishlyYours.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-flash theme init — runs before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
