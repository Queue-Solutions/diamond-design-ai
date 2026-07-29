import type { ChatMessage, GeneratedConcept } from "@/types/design";

export function createHandoffContext(
  selectedConcept: GeneratedConcept,
  concepts: GeneratedConcept[],
  messages: ChatMessage[]
) {
  const selectedAt = new Date(selectedConcept.createdAt).getTime();
  const hasValidTimestamp = Number.isFinite(selectedAt);
  const sortedConcepts = [...concepts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const selectedIndex = sortedConcepts.findIndex((concept) => concept.id === selectedConcept.id);

  const conceptsAtSelection = sortedConcepts.filter((concept, index) => {
    if (concept.id === selectedConcept.id) return true;
    if (hasValidTimestamp) return new Date(concept.createdAt).getTime() <= selectedAt;
    return selectedIndex < 0 || index <= selectedIndex;
  });
  const messagesAtSelection = messages.filter((message) => {
    if (!hasValidTimestamp) return true;
    return new Date(message.createdAt).getTime() <= selectedAt;
  });

  return {
    concepts: conceptsAtSelection,
    conversationContext: messagesAtSelection
  };
}
