export type JewelryFontCategory =
  | "Arabic Elegant"
  | "Arabic Modern"
  | "English Script"
  | "English Luxury Serif"
  | "Minimal / Modern";

export type JewelryFont = {
  id: string;
  name: string;
  category: JewelryFontCategory;
  tags: string[];
  supportsArabic: boolean;
  supportsLatin: boolean;
  arabicSample: string;
  latinSample: string;
  note: string;
};

export const jewelryFonts: JewelryFont[] = [
  {
    id: "amiri",
    name: "Amiri",
    category: "Arabic Elegant",
    tags: ["Calligraphic", "Classic", "Refined"],
    supportsArabic: true,
    supportsLatin: true,
    arabicSample: "ليان",
    latinSample: "Layan",
    note: "A graceful Arabic serif with a formal, heritage feel for name pendants."
  },
  {
    id: "noto-naskh-arabic",
    name: "Noto Naskh Arabic",
    category: "Arabic Elegant",
    tags: ["Balanced", "Readable", "Traditional"],
    supportsArabic: true,
    supportsLatin: false,
    arabicSample: "نور",
    latinSample: "Nour",
    note: "Clear Arabic forms that help preserve exact spelling in delicate jewelry."
  },
  {
    id: "scheherazade-new",
    name: "Scheherazade New",
    category: "Arabic Elegant",
    tags: ["Classic", "Soft", "Ornate"],
    supportsArabic: true,
    supportsLatin: true,
    arabicSample: "مريم",
    latinSample: "Mariam",
    note: "A literary Arabic style with elegant curves for heirloom pieces."
  },
  {
    id: "cairo",
    name: "Cairo",
    category: "Arabic Modern",
    tags: ["Modern", "Clean", "Geometric"],
    supportsArabic: true,
    supportsLatin: true,
    arabicSample: "سارة",
    latinSample: "Sara",
    note: "Contemporary Arabic letterforms for minimal bracelets and daily-wear necklaces."
  },
  {
    id: "noto-kufi-arabic",
    name: "Noto Kufi Arabic",
    category: "Arabic Modern",
    tags: ["Kufi", "Bold", "Architectural"],
    supportsArabic: true,
    supportsLatin: false,
    arabicSample: "جود",
    latinSample: "Joud",
    note: "Structured Kufi geometry that works well for bold gold name jewelry."
  },
  {
    id: "reem-kufi",
    name: "Reem Kufi",
    category: "Arabic Modern",
    tags: ["Kufi", "Minimal", "Boutique"],
    supportsArabic: true,
    supportsLatin: true,
    arabicSample: "آدم",
    latinSample: "Adam",
    note: "A softer Kufi direction for modern Arabic pendants."
  },
  {
    id: "great-vibes",
    name: "Great Vibes",
    category: "English Script",
    tags: ["Script", "Romantic", "Elegant"],
    supportsArabic: false,
    supportsLatin: true,
    arabicSample: "ليلى",
    latinSample: "Layla",
    note: "A flowing Latin script suited to necklaces and sentimental gifts."
  },
  {
    id: "dancing-script",
    name: "Dancing Script",
    category: "English Script",
    tags: ["Casual Script", "Warm", "Personal"],
    supportsArabic: false,
    supportsLatin: true,
    arabicSample: "تالا",
    latinSample: "Tala",
    note: "Friendly handwritten energy for softer personalized designs."
  },
  {
    id: "cormorant-garamond",
    name: "Cormorant Garamond",
    category: "English Luxury Serif",
    tags: ["Luxury", "Serif", "Editorial"],
    supportsArabic: false,
    supportsLatin: true,
    arabicSample: "لينا",
    latinSample: "Lina",
    note: "High-fashion serif proportions for classic engraved initials and names."
  },
  {
    id: "cinzel",
    name: "Cinzel",
    category: "English Luxury Serif",
    tags: ["Classic", "Roman", "Formal"],
    supportsArabic: false,
    supportsLatin: true,
    arabicSample: "رامي",
    latinSample: "Rami",
    note: "Architectural capital forms for monograms, signets, and clean pendants."
  },
  {
    id: "montserrat",
    name: "Montserrat",
    category: "Minimal / Modern",
    tags: ["Minimal", "Modern", "Clean"],
    supportsArabic: false,
    supportsLatin: true,
    arabicSample: "ياسمين",
    latinSample: "Yasmin",
    note: "Simple modern geometry for understated everyday personalization."
  },
  {
    id: "lora",
    name: "Lora",
    category: "Minimal / Modern",
    tags: ["Soft Serif", "Balanced", "Modern"],
    supportsArabic: false,
    supportsLatin: true,
    arabicSample: "منى",
    latinSample: "Mona",
    note: "A calm serif choice that keeps Latin names polished without feeling ornate."
  }
];

export function getJewelryFontById(id: string | null | undefined) {
  if (!id) return undefined;
  return jewelryFonts.find((font) => font.id === id);
}
