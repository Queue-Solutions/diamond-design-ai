import type { DesignProfile } from "@/types/design";

const arabicUnicodePattern = /[\u0600-\u06ff\u0750-\u077f\u0870-\u089f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;

export function containsArabicText(value: string | null | undefined) {
  return arabicUnicodePattern.test(value ?? "");
}

export function requiresArabicJewelryLettering(profile: DesignProfile) {
  return isConfirmedArabicScript(profile.personalizationScript) || containsArabicText(profile.personalizationText);
}

function isConfirmedArabicScript(value: string) {
  return value.trim().toLowerCase() === "arabic";
}
