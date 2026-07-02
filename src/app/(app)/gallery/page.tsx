"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Gem, Heart, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { loadDiamondSession, type PersistedDiamondSession } from "@/lib/session-store";
import type { GeneratedConcept } from "@/types/design";

export default function GalleryPage() {
  const [session, setSession] = useState<PersistedDiamondSession | null>(null);

  useEffect(() => {
    setSession(loadDiamondSession());
  }, []);

  const concepts = useMemo(
    () =>
      [...(session?.generatedConcepts ?? [])].sort((a, b) => {
        if (a.rootId === b.rootId) return a.version - b.version;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [session]
  );
  const favoriteIds = new Set(session?.favoriteIds ?? []);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Design history</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Gallery</h1>
        </div>
        <Button asChild variant="secondary">
          <Link href="/chat">Back to Workspace</Link>
        </Button>
      </section>

      {concepts.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {concepts.map((concept) => (
            <GalleryConceptCard
              key={concept.id}
              concept={concept}
              favorite={favoriteIds.has(concept.id)}
              finalized={session?.finalizedConceptId === concept.id}
            />
          ))}
        </section>
      ) : (
        <Card>
          <CardContent className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border bg-white/[0.05] text-diamond-champagne">
              <ImageIcon className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-white">No saved concepts yet</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Generate or upload a design in the workspace. Your V1, V2, and refined versions will appear here automatically.
            </p>
            <Button asChild className="mt-6">
              <Link href="/chat">Open Workspace</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GalleryConceptCard({
  concept,
  favorite,
  finalized
}: {
  concept: GeneratedConcept;
  favorite: boolean;
  finalized: boolean;
}) {
  return (
    <Card className="group overflow-hidden">
      <CardContent className="p-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-black">
          <img src={concept.url} alt={concept.variationName} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]" />
          <div className="absolute left-3 top-3 rounded-full border bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">
            V{concept.version}
          </div>
          {finalized ? (
            <div className="absolute right-3 top-3 rounded-full border border-diamond-champagne/40 bg-diamond-champagne/20 px-3 py-1 text-xs text-white backdrop-blur">
              Final Design
            </div>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4 px-5 pb-5 pt-1">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{concept.variationName}</p>
          <p className="text-sm text-muted-foreground">
            {concept.parentId ? `V${concept.version} refinement` : "Original concept"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" aria-label="Favorite design">
            {favorite ? <Heart className="h-4 w-4 fill-diamond-champagne text-diamond-champagne" /> : <Heart className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" aria-label="Download design" asChild>
            <a href={concept.url} download={`diamond-concept-v${concept.version}.webp`}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <Button size="icon" variant="ghost" aria-label="Open workspace" asChild>
            <Link href="/chat">
              <Gem className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
