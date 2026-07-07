"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Gem, Heart, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  loadDiamondSession,
  loadSavedDesigns,
  saveDiamondSession,
  saveSavedDesigns,
  type PersistedDiamondSession,
  type PersistedSavedDesigns
} from "@/lib/session-store";
import type { GeneratedConcept } from "@/types/design";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/components/auth/auth-provider";

export default function GalleryPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [session, setSession] = useState<PersistedDiamondSession | null>(null);
  const [savedDesigns, setSavedDesigns] = useState<PersistedSavedDesigns | null>(null);

  useEffect(() => {
    setSession(loadDiamondSession(user?.id));
    setSavedDesigns(loadSavedDesigns(user?.id));
  }, [user?.id]);

  const concepts = useMemo(
    () =>
      mergeConcepts(savedDesigns?.generatedConcepts ?? [], session?.generatedConcepts ?? []).sort((a, b) => {
        if (a.rootId === b.rootId) return a.version - b.version;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [savedDesigns, session]
  );
  const favoriteIds = new Set([...(savedDesigns?.favoriteIds ?? []), ...(session?.favoriteIds ?? [])]);
  const savedConcepts = concepts.filter((concept) => favoriteIds.has(concept.id));

  function toggleFavorite(id: string) {
    setSavedDesigns((saved) => {
      const nextSavedIds = new Set(saved?.favoriteIds ?? []);
      if (nextSavedIds.has(id)) nextSavedIds.delete(id);
      else nextSavedIds.add(id);
      const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
      const nextSaved = {
        generatedConcepts: Array.from(nextSavedIds)
          .map((conceptId) => conceptById.get(conceptId))
          .filter((concept): concept is GeneratedConcept => Boolean(concept)),
        favoriteIds: Array.from(nextSavedIds),
        finalizedConceptId: saved?.finalizedConceptId ?? session?.finalizedConceptId ?? ""
      };
      saveSavedDesigns(nextSaved, user?.id);
      return nextSaved;
    });

    setSession((current) => {
      if (!current) return current;
      const nextFavoriteIds = new Set(current.favoriteIds);
      if (nextFavoriteIds.has(id)) nextFavoriteIds.delete(id);
      else nextFavoriteIds.add(id);
      const nextSession = { ...current, favoriteIds: Array.from(nextFavoriteIds) };
      saveDiamondSession(nextSession, user?.id);
      return nextSession;
    });
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-diamond-champagne/70">{t("Saved by you", "المحفوظة بواسطتك")}</p>
          <h1 className="font-display mt-2 text-4xl font-medium text-diamond-pearl">{t("My Designs", "تصاميمي")}</h1>
        </div>
        <Button asChild variant="secondary">
          <Link href="/chat">{t("Back to Workspace", "العودة إلى مساحة العمل")}</Link>
        </Button>
      </section>

      {savedConcepts.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {savedConcepts.map((concept) => (
            <GalleryConceptCard
              key={concept.id}
              concept={concept}
              favorite={favoriteIds.has(concept.id)}
              finalized={session?.finalizedConceptId === concept.id}
              onToggleFavorite={toggleFavorite}
              finalLabel={t("Final Design", "التصميم النهائي")}
              originalLabel={t("Original concept", "التصور الأصلي")}
              refinementLabel={t("refinement", "تنقيح")}
            />
          ))}
        </section>
      ) : (
        <Card>
          <CardContent className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05] text-diamond-champagne shadow-[inset_0_0_0_1px_rgba(215,196,154,0.16)]">
              <ImageIcon className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-medium text-white">{t("No favorite designs yet", "لا توجد تصاميم مفضلة بعد")}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {t(
                "Favorite a generated, uploaded, or refined design in the chat. Your selected pieces will appear here automatically.",
                "ضع علامة مفضلة على تصميم منشأ أو مرفوع أو منقح داخل المحادثة، وستظهر اختياراتك هنا تلقائياً."
              )}
            </p>
            <Button asChild className="mt-6">
              <Link href="/chat">{t("Open Workspace", "فتح مساحة العمل")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function mergeConcepts(...groups: GeneratedConcept[][]) {
  const concepts = new Map<string, GeneratedConcept>();
  for (const group of groups) {
    for (const concept of group) concepts.set(concept.id, concept);
  }
  return Array.from(concepts.values());
}

function GalleryConceptCard({
  concept,
  favorite,
  finalized,
  onToggleFavorite,
  finalLabel,
  originalLabel,
  refinementLabel
}: {
  concept: GeneratedConcept;
  favorite: boolean;
  finalized: boolean;
  onToggleFavorite: (id: string) => void;
  finalLabel: string;
  originalLabel: string;
  refinementLabel: string;
}) {
  return (
    <Card className="group overflow-hidden">
      <CardContent className="p-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-black">
          <img src={concept.url} alt={concept.variationName} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]" />
          {finalized ? (
            <div className="absolute right-3 top-3 rounded-full bg-diamond-champagne/20 px-3 py-1 text-xs text-white shadow-[inset_0_0_0_1px_rgba(215,196,154,0.18)] backdrop-blur">
              {finalLabel}
            </div>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4 px-5 pb-5 pt-1">
        <div className="min-w-0">
          <p className="font-display truncate text-xl font-medium text-white">{concept.variationName}</p>
          <p className="text-sm text-muted-foreground">{concept.parentId ? refinementLabel : originalLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" aria-label={favorite ? "Unlike design" : "Favorite design"} onClick={() => onToggleFavorite(concept.id)}>
            {favorite ? <Heart className="h-4 w-4 fill-diamond-champagne text-diamond-champagne" /> : <Heart className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" aria-label="Download design" onClick={() => void downloadConceptAsPng(concept)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Open workspace" asChild>
            <Link href={`/chat?inspiration=${encodeURIComponent(concept.url)}&title=${encodeURIComponent(concept.variationName)}`}>
              <Gem className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

async function downloadConceptAsPng(concept: GeneratedConcept) {
  const response = await fetch(concept.url);
  if (!response.ok) return;

  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas export unavailable.");

    context.drawImage(image, 0, 0);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    triggerDownload(pngBlob ?? blob, `${safeFileName(concept.variationName || "diamond-design")}.png`);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function triggerDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "diamond-design"
  );
}
