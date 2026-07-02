"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowRight, Gem, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

const inspirationImages = [
  {
    title: "Oval Solitaire",
    titleAr: "خاتم أوفال سوليتير",
    style: "Classic engagement ring",
    styleAr: "خاتم خطوبة كلاسيكي",
    imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Emerald Halo",
    titleAr: "هالة بقطع زمردي",
    style: "Vintage diamond setting",
    styleAr: "ترصيع ألماس بطابع كلاسيكي",
    imageUrl: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Diamond Pendant",
    titleAr: "قلادة ألماس",
    style: "Minimal necklace study",
    styleAr: "اتجاه ناعم لقلادة بسيطة",
    imageUrl: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Pear Cut Ring",
    titleAr: "خاتم بقطع كمثري",
    style: "Statement bridal direction",
    styleAr: "اتجاه بارز للعروس",
    imageUrl: "https://images.unsplash.com/photo-1589674781759-c21c37956a44?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Tennis Bracelet",
    titleAr: "سوار تنس ألماس",
    style: "Continuous diamond line",
    styleAr: "خط متصل من الألماس",
    imageUrl: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Sapphire Accent",
    titleAr: "لمسة ياقوت",
    style: "Colored stone inspiration",
    styleAr: "إلهام بحجر ملون",
    imageUrl: "https://images.unsplash.com/photo-1603974372039-adc49044b6bd?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Stacked Bands",
    titleAr: "خواتم متراكبة",
    style: "Modern layered profile",
    styleAr: "طابع عصري بطبقات متعددة",
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Pave Detail",
    titleAr: "تفاصيل بافيه",
    style: "Fine surface sparkle",
    styleAr: "لمعان دقيق على السطح",
    imageUrl: "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=900&q=85"
  }
];

export default function InspirationPage() {
  const { isArabic, t } = useLanguage();

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-diamond-champagne/70">{t("Reference library", "مكتبة المراجع")}</p>
          <h1 className="font-display mt-2 text-4xl font-medium text-diamond-pearl">{t("Inspiration", "إلهام")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            {t(
              "Browse diamond jewelry directions. Send any reference into the atelier and the agent can begin refining from it.",
              "تصفح اتجاهات مجوهرات الألماس، ثم أرسل أي مرجع إلى الأتيليه ليبدأ الوكيل في تنقيحه."
            )}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/chat">{t("Open Atelier", "فتح الأتيليه")}</Link>
        </Button>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {inspirationImages.map((item) => (
          <article
            key={item.title}
            className="group overflow-hidden rounded-[1.5rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012))] shadow-[inset_0_1px_0_rgba(215,196,154,0.10),0_24px_80px_rgba(0,0,0,0.36)]"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-black">
              <img src={item.imageUrl} alt={isArabic ? item.titleAr : item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
              <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs text-diamond-champagne shadow-[inset_0_0_0_1px_rgba(215,196,154,0.16)] backdrop-blur">
                <Gem className="mr-1 inline h-3.5 w-3.5" />
                {t("Reference", "مرجع")}
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <h2 className="font-display text-2xl font-medium text-diamond-pearl">{isArabic ? item.titleAr : item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{isArabic ? item.styleAr : item.style}</p>
              </div>
              <Button asChild className="w-full" variant="secondary">
                <Link
                  href={`/chat?inspiration=${encodeURIComponent(item.imageUrl)}&title=${encodeURIComponent(isArabic ? item.titleAr : item.title)}`}
                >
                  <Sparkles className="h-4 w-4" />
                  {t("Use in Atelier", "استخدمه في الأتيليه")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

