"use client";

import Link from "next/link";
import {
  Amiri,
  Cairo,
  Cinzel,
  Cormorant_Garamond,
  Dancing_Script,
  Great_Vibes,
  Lora,
  Montserrat,
  Noto_Kufi_Arabic,
  Noto_Naskh_Arabic,
  Reem_Kufi,
  Scheherazade_New
} from "next/font/google";
import { ArrowRight, Gem, LetterText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { jewelryFonts, type JewelryFontCategory } from "@/config/jewelry-fonts";

const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
const notoNaskhArabic = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "600", "700"], display: "swap" });
const scheherazadeNew = Scheherazade_New({ subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "600", "700"], display: "swap" });
const notoKufiArabic = Noto_Kufi_Arabic({ subsets: ["arabic"], weight: ["400", "600", "700"], display: "swap" });
const reemKufi = Reem_Kufi({ subsets: ["arabic"], weight: ["400", "600"], display: "swap" });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", display: "swap" });
const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });
const lora = Lora({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

const fontClassById: Record<string, string> = {
  amiri: amiri.className,
  "noto-naskh-arabic": notoNaskhArabic.className,
  "scheherazade-new": scheherazadeNew.className,
  cairo: cairo.className,
  "noto-kufi-arabic": notoKufiArabic.className,
  "reem-kufi": reemKufi.className,
  "great-vibes": greatVibes.className,
  "dancing-script": dancingScript.className,
  "cormorant-garamond": cormorantGaramond.className,
  cinzel: cinzel.className,
  montserrat: montserrat.className,
  lora: lora.className
};

const categories: JewelryFontCategory[] = [
  "Arabic Elegant",
  "Arabic Modern",
  "English Script",
  "English Luxury Serif",
  "Minimal / Modern"
];

export default function FontsPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0c0c0b] p-6 shadow-[inset_0_1px_0_rgba(215,196,154,0.14),0_30px_100px_rgba(0,0,0,0.42)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(215,196,154,0.14),transparent_26rem)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/[0.035] px-4 py-2 text-xs uppercase tracking-[0.24em] text-diamond-champagne/75 shadow-[inset_0_0_0_1px_rgba(215,196,154,0.10)]">
              <LetterText className="h-3.5 w-3.5" />
              Fonts for personalized jewelry
            </div>
            <h1 className="font-display text-4xl font-medium leading-tight text-diamond-pearl md:text-5xl">
              Choose a lettering style before the atelier begins.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Browse curated Arabic and Latin fonts for name pendants, bracelets, rings, and engraved pieces. Select a font,
              then continue to chat so the agent can use it as part of the design direction.
            </p>
          </div>
          <div className="rounded-2xl bg-diamond-champagne/10 p-4 text-sm leading-6 text-diamond-champagne shadow-[inset_0_0_0_1px_rgba(215,196,154,0.18)] lg:max-w-sm">
            For Arabic names, provide the exact Arabic spelling. The Arabic text is the source of truth; English transliteration
            is only a helper.
          </div>
        </div>
      </section>

      {categories.map((category) => {
        const fonts = jewelryFonts.filter((font) => font.category === category);
        return (
          <section key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <Gem className="h-4 w-4 text-diamond-champagne" />
              <h2 className="font-display text-3xl font-medium text-diamond-pearl">{category}</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {fonts.map((font) => (
                <article
                  key={font.id}
                  className="group overflow-hidden rounded-[1.55rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] shadow-[inset_0_1px_0_rgba(215,196,154,0.10),0_24px_80px_rgba(0,0,0,0.34)]"
                >
                  <div className="relative min-h-64 overflow-hidden bg-[#080808] p-5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(215,196,154,0.15),transparent_18rem)]" />
                    <div className="relative flex min-h-52 flex-col justify-between">
                      <div className="flex flex-wrap gap-2">
                        {font.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-black/45 px-3 py-1 text-xs text-diamond-champagne shadow-[inset_0_0_0_1px_rgba(215,196,154,0.14)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-3 py-6 text-center">
                        <p
                          dir={font.supportsArabic ? "rtl" : "ltr"}
                          className={cn(
                            "text-6xl leading-tight text-diamond-pearl md:text-7xl",
                            fontClassById[font.id]
                          )}
                        >
                          {font.supportsArabic ? font.arabicSample : font.latinSample}
                        </p>
                        <p
                          className={cn(
                            "text-3xl leading-tight text-diamond-champagne/85",
                            fontClassById[font.id]
                          )}
                        >
                          {font.supportsLatin ? font.latinSample : font.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <h3 className="font-display text-2xl font-medium text-diamond-pearl">{font.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{font.note}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {font.supportsArabic ? <span>Arabic</span> : null}
                      {font.supportsLatin ? <span>Latin</span> : null}
                    </div>
                    <Button asChild className="w-full">
                      <Link href={`/chat?font=${encodeURIComponent(font.id)}`}>
                        <Sparkles className="h-4 w-4" />
                        Design with this font
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
