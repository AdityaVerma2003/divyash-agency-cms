import Link from "next/link";

const SOCIAL = [
  {
    label: "Facebook",
    href: "https://facebook.com/divyashdigital",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: "Twitter / X",
    href: "https://x.com/divyashdigital",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com/divyashdigital/",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Pinterest",
    href: "https://in.pinterest.com/divyashdigitalagency/",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29-.09-.78-.17-1.98.04-2.83.18-.76 1.23-5.22 1.23-5.22s-.31-.63-.31-1.56c0-1.46.85-2.56 1.9-2.56.9 0 1.33.67 1.33 1.48 0 .9-.58 2.26-.87 3.51-.25 1.05.52 1.9 1.54 1.9 1.85 0 3.09-2.37 3.09-5.17 0-2.13-1.43-3.62-3.47-3.62-2.36 0-3.75 1.77-3.75 3.6 0 .71.27 1.48.61 1.9.07.08.08.15.06.23-.06.25-.2.81-.23.93-.04.15-.13.18-.3.11-1.12-.52-1.82-2.17-1.82-3.49 0-2.84 2.06-5.45 5.94-5.45 3.12 0 5.55 2.22 5.55 5.19 0 3.1-1.95 5.59-4.65 5.59-.91 0-1.76-.47-2.05-1.03l-.56 2.08c-.2.78-.75 1.76-1.12 2.36.85.26 1.75.4 2.68.4 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
      </svg>
    ),
  },
];

const EXPLORE_COL1 = [
  { label: "About Us",    href: "/contact" },
  { label: "Meet Our Team", href: "/team" },
  { label: "Our Portfolio", href: "/work" },
  { label: "Blog",        href: "/blog" },
  { label: "Contact",     href: "/contact" },
];

const EXPLORE_COL2 = [
  { label: "Privacy Policy",    href: "/privacy-policy" },
  { label: "Terms of Use",      href: "/terms-and-conditions" },
  { label: "Payment Terms",     href: "/terms-and-conditions#payment-terms" },
  { label: "Refund Policy",     href: "/refund-policy" },
  { label: "Client Portal",     href: "/login" },
];

const PARTNERS = [
  { src: "/googlePartner.svg", alt: "Google Partner" },
  { src: "/metaBusiness.svg",  alt: "Meta Business Partner" },
  { src: "/clutch.svg",        alt: "Reviewed on Clutch — 5.0" },
  { src: "/trustpilot.svg",    alt: "Trustpilot" },
  { src: "/msme.svg",          alt: "MSME Registered" },
];

const TERMS_LINKS = [
  { label: "Privacy Policy",     href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Payment Terms",      href: "/terms-and-conditions#payment-terms" },
  { label: "Refund Policy",      href: "/refund-policy" },
];


function WorldMapBg() {
  return (
    <svg
      viewBox="0 0 1000 500"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        {/* 5×5 grid cell with a 2.5×2.5 filled square — gives a clean dot/square grid */}
        <pattern id="squareGrid" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
          <rect x="0.5" y="0.5" width="2.5" height="2.5" fill="white" />
        </pattern>
        {/* Continent shapes used as a mask so only dots inside land show.
            Equirectangular projection: x = (lon+180)/360*1000, y = (90-lat)/180*500 */}
        <mask id="landMask">
          {/* North America — Alaska, Canada, USA, Mexico, Central America */}
          <path d="M33,69 L67,53 L110,58 L153,56 L200,50 L250,48 L278,47 L300,55 L318,72 L344,100 L338,112 L322,125 L300,140 L288,160 L278,181 L268,190 L250,186 L231,178 L215,186 L208,194 L214,206 L232,214 L258,220 L283,225 L276,233 L258,228 L236,216 L212,200 L190,180 L172,160 L156,139 L144,111 L128,96 L100,88 L70,84 L48,78 Z" fill="white"/>
          {/* Greenland */}
          <path d="M339,50 L375,19 L420,22 L444,42 L438,60 L431,72 L400,86 L370,88 L352,74 Z" fill="white"/>
          {/* South America */}
          <path d="M292,217 L320,222 L333,228 L360,235 L385,248 L403,264 L400,282 L392,300 L381,314 L368,330 L350,347 L338,366 L325,385 L311,403 L300,396 L296,378 L292,375 L288,352 L282,322 L275,290 L272,267 L275,250 L280,232 Z" fill="white"/>
          {/* Europe — Iberia through Scandinavia to the Urals */}
          <path d="M475,142 L489,117 L486,100 L500,95 L520,80 L545,64 L569,53 L590,58 L600,69 L620,64 L650,62 L667,69 L672,88 L660,105 L644,118 L620,125 L597,125 L578,133 L564,144 L542,139 L520,142 L500,148 L482,152 Z" fill="white"/>
          {/* UK & Ireland */}
          <path d="M478,96 L492,88 L500,98 L496,110 L484,112 L474,104 Z" fill="white"/>
          {/* Africa */}
          <path d="M453,158 L490,150 L528,147 L560,152 L594,164 L600,182 L612,200 L630,208 L642,217 L636,230 L622,244 L614,256 L611,272 L614,288 L611,306 L596,325 L578,340 L556,347 L536,340 L520,322 L512,300 L508,278 L500,258 L490,244 L478,239 L469,236 L460,225 L453,208 L450,186 Z" fill="white"/>
          {/* Madagascar */}
          <path d="M628,292 L638,296 L640,310 L634,322 L626,318 L624,304 Z" fill="white"/>
          {/* Asia — Middle East, Russia, China, SE Asia */}
          <path d="M644,125 L667,69 L694,47 L740,42 L800,44 L850,46 L889,50 L930,56 L975,62 L1000,67 L996,86 L960,92 L944,83 L920,94 L900,110 L892,131 L878,140 L861,144 L856,152 L839,164 L820,180 L810,200 L803,219 L792,232 L786,244 L770,240 L756,228 L740,214 L722,206 L714,228 L700,240 L688,228 L694,200 L694,186 L680,180 L664,186 L656,181 L648,170 L640,160 L630,150 L620,140 L628,132 Z" fill="white"/>
          {/* Arabian Peninsula */}
          <path d="M600,182 L622,172 L648,170 L656,181 L650,200 L634,214 L619,214 L608,200 Z" fill="white"/>
          {/* Japan */}
          <path d="M878,126 L892,131 L896,142 L884,152 L872,158 L864,150 L868,136 Z" fill="white"/>
          {/* Indonesia & Philippines */}
          <path d="M764,236 L790,238 L800,248 L792,267 L778,262 L766,250 Z" fill="white"/>
          <path d="M812,255 L838,252 L852,262 L840,272 L818,268 Z" fill="white"/>
          <path d="M858,244 L880,240 L900,252 L920,262 L900,272 L876,266 L860,256 Z" fill="white"/>
          {/* Australia */}
          <path d="M819,344 L817,311 L832,296 L864,283 L880,286 L897,281 L910,296 L920,310 L925,325 L916,344 L903,356 L883,347 L862,352 L840,352 Z" fill="white"/>
          {/* New Zealand */}
          <path d="M946,362 L958,356 L964,368 L954,380 L944,374 Z" fill="white"/>
        </mask>
      </defs>
      {/* Fill the whole canvas with the square grid, but only show through land shapes */}
      <rect width="1000" height="500" fill="url(#squareGrid)" mask="url(#landMask)" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#111318] text-white/60">

      {/* Main grid */}
      <div className="relative mx-auto max-w-7xl px-5 py-14 md:py-16 overflow-hidden">
        {/* World map background */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.15]">
          <WorldMapBg />
        </div>
        <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Col 1 — Brand */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/divyash-logo.jpeg"
              alt="Divyash Digital"
              className="mb-4 h-10 w-auto rounded-lg object-contain sm:h-12 md:h-14 lg:h-16"
            />
            <p className="mb-5 max-w-[220px] text-sm leading-relaxed text-white/50">
              At Divyash Digital, we believe in the power of digital innovation to transform businesses and elevate brands to new heights.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {SOCIAL.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-white/50 transition-colors hover:bg-white/15 hover:text-white"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Explore */}
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">Explore</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <ul className="space-y-2.5">
                {EXPLORE_COL1.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="transition-colors hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2.5">
                {EXPLORE_COL2.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="transition-colors hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Col 3 — Contact */}
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">Contact</p>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:+918810376026" className="flex items-start gap-3 transition-colors hover:text-white group">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/50 group-hover:bg-white/15 group-hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  +91 88103 76026
                </a>
              </li>
              <li>
                <a href="tel:+919266452049" className="flex items-start gap-3 transition-colors hover:text-white group">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/50 group-hover:bg-white/15 group-hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  +91 92664 52049
                </a>
              </li>
              <li>
                <a href="mailto:info@divyashdigital.co.in" className="flex items-start gap-3 transition-colors hover:text-white group">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/50 group-hover:bg-white/15 group-hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  info@divyashdigital.co.in
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4 — WhatsApp CTA */}
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">WhatsApp Us</p>
            <p className="mb-5 text-sm leading-relaxed text-white/50">
              Chat with our team directly on WhatsApp. We&apos;re available Mon–Sat, 10am–6pm IST.
            </p>
            <a
              href="https://wa.me/918810376026"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/20 transition-all hover:bg-[#20bd5a] hover:-translate-y-0.5 motion-reduce:translate-y-0"
            >
              {/* WhatsApp SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              Chat on WhatsApp
            </a>
            <p className="mt-3 text-xs text-white/30">+91 88103 76026</p>
          </div>
        </div>
      </div>

      {/* Partner & accreditation badges — centered, equal size, equal spacing */}
      <div className="mx-auto max-w-7xl px-5 py-10 md:py-12">
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
          {PARTNERS.map(({ src, alt }) => (
            <div
              key={alt}
              className="flex h-14 w-32 flex-shrink-0 items-center justify-center transition-transform duration-300 hover:-translate-y-1 motion-reduce:translate-y-0 sm:h-16 sm:w-40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-white/8" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="mx-auto max-w-7xl px-5 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-white/25">
          <p>© Copyright {new Date().getFullYear()} Divyash Digital Marketing Agency. All Rights Reserved.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {TERMS_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} className="transition-colors hover:text-white/60">{label}</Link>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}
