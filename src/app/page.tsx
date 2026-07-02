/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowRight, Feather, Gem, PenLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";

export default function LandingPage() {
  const { isArabic, toggleLanguage, t } = useLanguage();
  const localizedNotes = [
    {
      title: t("Private consultation", "استشارة خاصة"),
      description: t("A guided exchange shaped like an atelier appointment.", "حوار موجه يشبه موعداً داخل أتيليه خاص.")
    },
    {
      title: t("Diamond-led direction", "اتجاه مستوحى من الألماس"),
      description: t("Visual concepts centered on stone, metal, silhouette, and emotion.", "تصورات بصرية تتمحور حول الحجر والمعدن والشكل والإحساس.")
    },
    {
      title: t("Artisan-ready handoff", "ملف جاهز للحرفي"),
      description: t("A final brief designed for conversation with a professional jeweler.", "ملخص نهائي مصمم للنقاش مع صائغ محترف.")
    }
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0b0b]">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=2200&q=85"
          alt="Macro diamond ring inspiration"
          className="h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b0b0b_0%,rgba(11,11,11,0.92)_35%,rgba(11,11,11,0.58)_68%,rgba(11,11,11,0.35)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
      </div>

      <div className="container relative flex min-h-screen flex-col py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-diamond-champagne/40 text-diamond-champagne">
              <Gem className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-2xl leading-none text-diamond-pearl">Maison DIA</span>
              <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.32em] text-diamond-champagne/70">
                Private Atelier
              </span>
            </span>
          </Link>
          <Button asChild variant="secondary">
            <Link href="/chat">{t("Enter Studio", "دخول الاستوديو")}</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleLanguage}>
            {isArabic ? "EN" : "عربي"}
          </Button>
        </header>

        <section className="flex flex-1 items-center py-16">
          <div className="max-w-3xl">
            <div className="mb-10 inline-flex items-center gap-3 border-b border-diamond-champagne/25 pb-3 text-xs uppercase tracking-[0.34em] text-diamond-champagne/80">
              <Feather className="h-4 w-4" />
              {t("Private diamond consultation", "استشارة ألماس خاصة")}
            </div>
            <h1 className="font-display text-balance text-6xl font-medium leading-[0.95] text-diamond-pearl md:text-8xl">
              {t("Every masterpiece begins with an idea.", "كل تحفة تبدأ بفكرة.")}
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-9 text-diamond-smoke md:text-xl">
              {t(
                "Enter a quiet design studio where AI helps translate imagination into a refined diamond concept for artisan review.",
                "ادخل استوديو تصميم هادئاً يساعدك فيه الذكاء الاصطناعي على تحويل الخيال إلى تصور ألماسي راقٍ للمراجعة الحرفية."
              )}
            </p>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/chat">
                  {t("Begin a Private Design", "ابدأ تصميماً خاصاً")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/chat">
                  <Upload className="h-4 w-4" />
                  {t("Bring a Reference", "إضافة مرجع")}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 pb-6 md:grid-cols-3">
          {localizedNotes.map((note, index) => (
            <div key={note.title} className="border-t border-diamond-champagne/20 pt-5">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-diamond-champagne/25 text-diamond-champagne">
                {index === 0 ? <Gem className="h-4 w-4" /> : index === 1 ? <PenLine className="h-4 w-4" /> : <Feather className="h-4 w-4" />}
              </div>
              <p className="font-display text-2xl text-diamond-pearl">{note.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
