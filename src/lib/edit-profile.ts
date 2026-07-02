import type { DesignProfile } from "@/types/design";

export function updateDesignProfileFromEdit(profile: DesignProfile, instruction: string): DesignProfile {
  const text = instruction.toLowerCase();
  const next: DesignProfile = {
    ...profile,
    notes: [...profile.notes]
  };

  if (text.includes("rose gold")) next.metal = "Rose Gold";
  if (text.includes("white gold")) next.metal = "White Gold";
  if (text.includes("yellow gold")) next.metal = "Yellow Gold";
  if (text.includes("platinum")) next.metal = "Platinum";

  const shapes = ["round", "oval", "emerald", "princess", "pear", "marquise", "radiant", "heart", "cushion"];
  const matchedShape = shapes.find((shape) => text.includes(shape));
  if (matchedShape) {
    next.diamondShape = titleCase(matchedShape);
  }

  if (text.includes("hidden halo")) next.setting = "Hidden Halo";
  else if (text.includes("remove halo") || text.includes("without halo") || text.includes("no halo")) {
    next.setting = next.setting.toLowerCase().includes("halo") ? "No Halo" : next.setting;
  } else if (text.includes("halo")) {
    next.setting = "Halo";
  }

  if (text.includes("thinner") || text.includes("thin band")) next.bandStyle = "Thin Band";
  if (text.includes("pave") || text.includes("pavé")) next.bandStyle = next.bandStyle ? `${next.bandStyle}, Pave` : "Pave";

  if (text.includes("minimal")) next.style = "Minimal";
  if (text.includes("luxurious") || text.includes("more luxury") || text.includes("more luxurious")) next.style = "Luxury";

  const note = `Edit request: ${instruction.trim()}`;
  if (!next.notes.includes(note)) {
    next.notes = [...next.notes, note].slice(-8);
  }

  return next;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
