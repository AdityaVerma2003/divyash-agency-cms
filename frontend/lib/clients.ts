/**
 * Client logos shown in the "Trusted by businesses" marquee and on the work page.
 *
 * Served directly from Cloudinary (folder: Logo_Clients) rather than bundled in
 * public/ — every source file is a large multi-layer SVG (some 1–2.5MB), so
 * shipping them in the app bundle would make it noticeably heavier. Cloudinary
 * rasterizes each on request, so what actually gets downloaded is a few KB per
 * logo instead of megabytes, and nothing needs to live in this repo at all.
 *
 * The transform does three things:
 *  - `f_webp` forces a real alpha-capable format — the default `f_auto`
 *    negotiation was landing on JPEG for some clients, which flattens
 *    transparency to an opaque white background.
 *  - `e_trim` crops the transparent margin each source SVG's own canvas
 *    carries around the actual mark, so the logo fills its box instead of
 *    floating small inside extra empty canvas.
 *  - `w_360` requests a larger base resolution now that logos render bigger
 *    on the page.
 *
 * `id` is the Cloudinary public_id (matches the original upload numbering).
 * Names were read off the artwork — correct any that are wrong here and both
 * the marquee and the work page pick it up.
 */
export interface ClientLogo {
  /** Cloudinary public_id inside the Logo_Clients folder */
  id: string;
  /** Company name, used as alt text */
  name: string;
}

export const CLIENT_LOGOS: ClientLogo[] = [
  { id: "1",  name: "Neetu Singh & Associates" },
  { id: "2",  name: "Thinkers Log" },
  { id: "3",  name: "All India Institute of Local Self Government" },
  { id: "4",  name: "Vedaanta Clinic" },
  { id: "5",  name: "Trust Dent Dental Care" },
  { id: "6",  name: "ETSAA — Earth to Sky Aviation Academy" },
  { id: "7",  name: "Films3.net" },
  { id: "8",  name: "MAK Aviation Academy" },
  { id: "9",  name: "Delhi Jal Board" },
  { id: "10", name: "Classento" },
  { id: "11", name: "Delhi Cantonment Board" },
  { id: "12", name: "Social Networks India" },
  { id: "13", name: "New Delhi Municipal Council" },
  { id: "14", name: "Startup Counter" },
  { id: "15", name: "Ink Play Foundation" },
  { id: "16", name: "MAK Makeup" },
  { id: "17", name: "Sumptuous" },
  { id: "18", name: "Pet Paradise" },
  { id: "19", name: "MindSparkz" },
  { id: "20", name: "FacioMaxillary & Dental Health Centre" },
  { id: "21", name: "Heritage Emblem" },
  { id: "22", name: "Precious Skincare" },
  { id: "23", name: "Homestead Realty" },
  { id: "24", name: "Multi Brand Car Workshop" },
  { id: "25", name: "FacioMaxillary Dental" },
  { id: "26", name: "R&D Dental" },
  { id: "27", name: "Visionary Global Consultancy" },
  { id: "28", name: "RR" },
  { id: "29", name: "Mindgear" },
  { id: "30", name: "MPJ" },
  { id: "31", name: "Dr Arora's Dental Care Centre" },
  { id: "32", name: "Amrit Mitra — Women for Water" },
  { id: "33", name: "SD Dental Care" },
  { id: "34", name: "Dental Care — Reason to Smile" },
  { id: "35", name: "The Adore Gem" },
  { id: "36", name: "The Springdale School, Varanasi" },
  { id: "37", name: "Pro Batteries" },
  { id: "38", name: "LCD Care" },
  { id: "39", name: "Shyam Multi-Speciality Clinic" },
  { id: "40", name: "Vastu Compass" },
  { id: "41", name: "Chef Daya" },
  { id: "42", name: "Phoenix" },
  { id: "43", name: "Kashiyana" },
  { id: "44", name: "Serene Beauty Makeover" },
  { id: "45", name: "Tandoor & Kathi Rolls" },
  { id: "46", name: "Stone Gateway" },
  { id: "47", name: "Shri Ram Banarsee Saree" },
  { id: "48", name: "Grace Smile Care Dental Clinic" },
  { id: "49", name: "Dental Care" },
  { id: "50", name: "Digital Campus" },
  { id: "51", name: "Wings" },
  { id: "52", name: "Pujya Ishwarchandra Ji Maharaj" },
  { id: "53", name: "Sarvda" },
  { id: "54", name: "Studio" },
  { id: "55", name: "F — Fashion World" },
];

const CLOUDINARY_CLOUD_NAME = "kerxqrrt";

/** Small rasterized delivery URL for a client logo — id is the Cloudinary public_id. */
export const clientLogoSrc = (id: string) =>
  `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/e_trim,f_webp,q_auto,w_360/${id}.svg`;

/** Split into two rows for the marquee, alternating so both rows stay balanced. */
export const CLIENT_LOGOS_ROW_1 = CLIENT_LOGOS.filter((_, i) => i % 2 === 0);
export const CLIENT_LOGOS_ROW_2 = CLIENT_LOGOS.filter((_, i) => i % 2 === 1);
