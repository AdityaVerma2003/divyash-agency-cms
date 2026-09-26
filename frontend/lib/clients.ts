/**
 * Client logos shown in the "Trusted by businesses" marquee and on the work page.
 *
 * Files live in `public/clients/`. Names were read off the artwork — correct any
 * that are wrong here and both the marquee and the work page pick it up.
 */
export interface ClientLogo {
  /** File name inside public/clients/ */
  file: string;
  /** Company name, used as alt text */
  name: string;
}

export const CLIENT_LOGOS: ClientLogo[] = [
  { file: "1.webp",  name: "Neetu Singh & Associates" },
  { file: "2.webp",  name: "Thinkers Log" },
  { file: "3.webp",  name: "All India Institute of Local Self Government" },
  { file: "4.webp",  name: "Vedaanta Clinic" },
  { file: "5.webp",  name: "Trust Dent Dental Care" },
  { file: "6.webp",  name: "ETSAA — Earth to Sky Aviation Academy" },
  { file: "7.svg",   name: "Films3.net" },
  { file: "8.webp",  name: "MAK Aviation Academy" },
  { file: "9.webp",  name: "Delhi Jal Board" },
  { file: "10.webp", name: "Classento" },
  { file: "11.webp", name: "Delhi Cantonment Board" },
  { file: "12.webp", name: "Social Networks India" },
  { file: "13.webp", name: "New Delhi Municipal Council" },
  { file: "14.svg",  name: "Startup Counter" },
  { file: "15.webp", name: "Ink Play Foundation" },
  { file: "16.webp", name: "MAK Makeup" },
  { file: "17.webp", name: "Sumptuous" },
  { file: "18.webp", name: "Pet Paradise" },
  { file: "19.webp", name: "MindSparkz" },
  { file: "20.webp", name: "FacioMaxillary & Dental Health Centre" },
  { file: "21.webp", name: "Heritage Emblem" },
  { file: "22.svg",  name: "Precious Skincare" },
  { file: "23.webp", name: "Homestead Realty" },
  { file: "24.webp", name: "Multi Brand Car Workshop" },
  { file: "25.webp", name: "FacioMaxillary Dental" },
  { file: "26.webp", name: "R&D Dental" },
  { file: "27.svg",  name: "Visionary Global Consultancy" },
  { file: "28.webp", name: "RR" },
  { file: "29.webp", name: "Mindgear" },
  { file: "30.webp", name: "MPJ" },
  { file: "31.svg",  name: "Dr Arora's Dental Care Centre" },
  { file: "32.webp", name: "Amrit Mitra — Women for Water" },
  { file: "33.webp", name: "SD Dental Care" },
  { file: "35.svg",  name: "The Adore Gem" },
  { file: "36.webp", name: "The Springdale School, Varanasi" },
  { file: "37.webp", name: "Pro Batteries" },
  { file: "38.svg",  name: "LCD Care" },
  { file: "39.svg",  name: "Shyam Multi-Speciality Clinic" },
  { file: "40.webp", name: "Vastu Compass" },
  { file: "42.webp", name: "Phoenix" },
  { file: "43.svg",  name: "Kashiyana" },
  { file: "44.webp", name: "Serene Beauty Makeover" },
  { file: "45.svg",  name: "Tandoor & Kathi Rolls" },
  { file: "46.webp", name: "Stone Gateway" },
  { file: "47.webp", name: "Shri Ram Banarsee Saree" },
  { file: "49.webp", name: "Dental Care" },
  { file: "50.webp", name: "Digital Campus" },
  { file: "51.webp", name: "Wings" },
  { file: "53.webp", name: "Sarvda" },
  { file: "54.webp", name: "Studio" },
  { file: "55.webp", name: "F — Fashion World" },
];

export const clientLogoSrc = (file: string) => `/clients/${file}`;

/** Split into two rows for the marquee, alternating so both rows stay balanced. */
export const CLIENT_LOGOS_ROW_1 = CLIENT_LOGOS.filter((_, i) => i % 2 === 0);
export const CLIENT_LOGOS_ROW_2 = CLIENT_LOGOS.filter((_, i) => i % 2 === 1);
