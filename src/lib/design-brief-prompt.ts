import type { DesignProfile, GeneratedConcept } from "@/types/design";

export function buildDesignBriefPrompt({
  profile,
  finalizedConcept,
  concepts,
  referenceId
}: {
  profile: DesignProfile;
  finalizedConcept: GeneratedConcept;
  concepts: GeneratedConcept[];
  referenceId: string;
}) {
  return `
You are preparing a luxury diamond jewelry workshop handoff document.

This is not CAD, not 3D, not a manufacturing-ready file, and not a production guarantee.
The brief bridges AI visual inspiration and review by a professional jeweler.

Return only valid JSON with this exact shape:
{
  "referenceId": "${referenceId}",
  "sessionSummary": "",
  "customerDesignSummary": "",
  "jewelryType": "",
  "occasion": "",
  "recipient": "",
  "style": "",
  "metal": "",
  "diamondShape": "",
  "setting": "",
  "bandStyle": "",
  "customerNotes": [],
  "designEvolution": "",
  "finalAiDescription": "",
  "workshopNotes": "",
  "recommendedDiscussionPoints": [],
  "revisionHistorySummary": "",
  "disclaimer": "This concept is intended for visual inspiration and workshop review. Final engineering and manufacturing decisions must be made by a professional jeweler."
}

Design profile:
${JSON.stringify(profile, null, 2)}

Finalized concept:
${JSON.stringify(finalizedConcept, null, 2)}

Revision history:
${JSON.stringify(
  concepts.map((concept) => ({
    version: concept.version,
    variationName: concept.variationName,
    description: concept.description,
    editInstruction: concept.editInstruction,
    parentId: concept.parentId
  })),
  null,
  2
)}
`.trim();
}
