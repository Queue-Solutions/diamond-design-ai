"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gem, Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { navigationItems } from "@/config/navigation";
import { AuthButton } from "@/components/auth/auth-button";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/lib/language";
import { diamondSessionStorageKey } from "@/lib/session-store";

export function Header() {
  const { isArabic, toggleLanguage, t } = useLanguage();
  const { supabase, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase || !user) {
      setIsAdmin(false);
      return;
    }

    let mounted = true;
    void supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: "customer" | "admin" }>()
      .then(({ data }) => {
        if (mounted) setIsAdmin(data?.role === "admin");
      });

    return () => {
      mounted = false;
    };
  }, [supabase, user]);

  function startNewDesign() {
    window.localStorage.removeItem(diamondSessionStorageKey);
    window.location.assign(`/chat?newDesign=${Date.now()}`);
  }

  return (
    <header className="sticky top-0 z-30 bg-[#050505]/82 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-[1500px] items-center justify-between gap-4 px-4 md:px-7">
        <div className="flex items-center gap-3 lg:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-6 translate-y-0 sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("Navigation", "التنقل")}</DialogTitle>
              </DialogHeader>
              <nav className="grid gap-2 pt-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-4 py-3 text-sm text-muted-foreground shadow-[inset_0_0_0_1px_rgba(215,196,154,0.08)] transition hover:bg-white/[0.07] hover:text-white"
                  >
                    <item.icon className="h-4 w-4" />
                    {isArabic ? item.titleAr : item.title}
                  </Link>
                ))}
              </nav>
            </DialogContent>
          </Dialog>
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <Gem className="h-5 w-5 text-diamond-champagne" />
            <span className="font-display text-xl font-medium">Maison DIA</span>
          </Link>
        </div>
        <div className="hidden min-w-0 flex-1 items-center rounded-full bg-white/[0.035] px-5 py-3 text-muted-foreground shadow-[inset_0_0_0_1px_rgba(215,196,154,0.08)] md:flex lg:max-w-md">
          <Sparkles className="h-4 w-4 text-diamond-champagne/70 ltr:mr-3 rtl:ml-3" />
          <span className="truncate text-sm">{t("Private diamond design studio", "استوديو خاص لتصميم المجوهرات")}</span>
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={toggleLanguage} aria-label={t("Switch to Arabic", "التبديل إلى الإنجليزية")}>
            {isArabic ? "EN" : "عربي"}
          </Button>
          <Button asChild variant="secondary" className="hidden sm:inline-flex">
            <Link href="/gallery">{t("View Gallery", "عرض التصاميم")}</Link>
          </Button>
          {isAdmin ? (
            <Button asChild variant="secondary" className="hidden sm:inline-flex">
              <Link href="/admin">{t("Admin Dashboard", "Admin Dashboard")}</Link>
            </Button>
          ) : null}
          <Button className="hidden sm:inline-flex" onClick={startNewDesign}>
            {t("New Design", "تصميم جديد")}
          </Button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
