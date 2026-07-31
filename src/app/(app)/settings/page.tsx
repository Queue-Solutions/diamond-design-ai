"use client";

import { useEffect, useState } from "react";
import { Gauge, Gem, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { publicEnv } from "@/config/public-env";
import { useLanguage } from "@/lib/language";

type UsageState = {
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  bonusClaimsUsed: number;
  bonusClaimsRemaining: number;
  bonusCreditsGranted: number;
  canClaimBonus: boolean;
};

export default function SettingsPage() {
  const { user, getAccessToken } = useAuth();
  const { t } = useLanguage();
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);
  const [bonusNotice, setBonusNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      setUsage(null);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    void getAccessToken()
      .then((token) => fetch("/api/usage", { headers: token ? { Authorization: `Bearer ${token}` } : {} }))
      .then((response) => response.json())
      .then((payload: { usage?: UsageState }) => {
        if (mounted) setUsage(payload.usage ?? null);
      })
      .catch(() => {
        if (mounted) setUsage(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [getAccessToken, user]);

  async function claimBonusCredits() {
    if (!user || !usage?.canClaimBonus || isClaimingBonus) return;

    setIsClaimingBonus(true);
    setBonusNotice(null);

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/usage", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const payload = (await response.json()) as {
        usage?: UsageState;
        error?: string;
        code?: "BONUS_NOT_AVAILABLE" | "MONTHLY_BONUS_LIMIT_REACHED";
      };

      if (!response.ok || !payload.usage) {
        const translatedError =
          payload.code === "MONTHLY_BONUS_LIMIT_REACHED"
            ? t(
                "You've already used both bonus credit claims for this month.",
                "لقد استخدمت بالفعل فرصتي الرصيد الإضافي لهذا الشهر."
              )
            : payload.code === "BONUS_NOT_AVAILABLE"
              ? t(
                  "Bonus credits become available when your daily or monthly credits reach zero.",
                  "يتاح الرصيد الإضافي عند وصول رصيدك اليومي أو الشهري إلى الصفر."
                )
              : payload.error;
        throw new Error(translatedError || t("Bonus credits could not be added.", "تعذرت إضافة الرصيد الإضافي."));
      }

      setUsage(payload.usage);
      setBonusNotice({
        type: "success",
        text: t(
          "2 extra image credits were added to your account.",
          "تمت إضافة رصيدين إضافيين للصور إلى حسابك."
        )
      });
    } catch (error) {
      setBonusNotice({
        type: "error",
        text: error instanceof Error ? error.message : t("Bonus credits could not be added.", "تعذرت إضافة الرصيد الإضافي.")
      });
    } finally {
      setIsClaimingBonus(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.26em] text-diamond-champagne/70">{t("Account profile", "الملف الشخصي")}</p>
        <h1 className="font-display mt-2 text-4xl font-medium text-diamond-pearl">{t("Credits & Limits", "الرصيد والحدود")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          {t("Review image generation availability for your private atelier sessions.", "راجع رصيد إنشاء الصور المتاح لجلسات الأتيليه الخاصة بك.")}
        </p>
      </section>

      {publicEnv.demoMode ? (
        <section className="rounded-[1.5rem] bg-diamond-champagne/10 p-5 shadow-[inset_0_0_0_1px_rgba(215,196,154,0.18)]">
          <h2 className="font-display text-2xl font-medium text-white">{t("Demo mode enabled", "وضع العرض مفعل")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("Demo mode is active. Production deployments should use `NEXT_PUBLIC_DEMO_MODE=false`.", "وضع العرض مفعل. يجب أن تستخدم بيئة الإنتاج `NEXT_PUBLIC_DEMO_MODE=false`.")}
          </p>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-diamond-champagne">
              <Mail className="h-5 w-5" />
            </div>
            <CardTitle>{t("Account", "الحساب")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              {user?.email ?? t("Sign in to view account limits and saved design access.", "سجل الدخول لعرض حدود الحساب والتصاميم المحفوظة.")}
            </p>
          </CardContent>
        </Card>

        <CreditCard
          title={t("Daily Credits", "الرصيد اليومي")}
          used={usage?.dailyUsed}
          limit={usage?.dailyLimit}
          remaining={usage?.dailyRemaining}
          loading={isLoading}
          remainingLabel={t("remaining", "متبقي")}
          signInLabel={t("Sign in", "سجل الدخول")}
          usedFromLabel={(usedValue, limitValue) => t(`${usedValue} used from ${limitValue}`, `تم استخدام ${usedValue} من ${limitValue}`)}
          emptyLabel={t("Usage appears after sign in.", "يظهر الاستخدام بعد تسجيل الدخول.")}
        />
        <CreditCard
          title={t("Monthly Credits", "الرصيد الشهري")}
          used={usage?.monthlyUsed}
          limit={usage?.monthlyLimit}
          remaining={usage?.monthlyRemaining}
          loading={isLoading}
          remainingLabel={t("remaining", "متبقي")}
          signInLabel={t("Sign in", "سجل الدخول")}
          usedFromLabel={(usedValue, limitValue) => t(`${usedValue} used from ${limitValue}`, `تم استخدام ${usedValue} من ${limitValue}`)}
          emptyLabel={t("Usage appears after sign in.", "يظهر الاستخدام بعد تسجيل الدخول.")}
        />
      </section>

      <Card>
        <CardHeader>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-diamond-champagne">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>{t("Usage Rules", "قواعد الاستخدام")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <LimitNote icon={Gem} title={t("1 credit", "رصيد واحد")} description={t("Each generated concept, uploaded reference save, or edited image may count against image usage depending on the route.", "كل تصور منشأ أو مرجع محفوظ أو صورة معدلة قد يُحسب من رصيد الصور حسب نوع العملية.")} />
          <LimitNote icon={Gauge} title={t("Backend enforced", "مفروض من الخادم")} description={t("Limits are checked before AI image calls, so unavailable credits should stop expensive work early.", "يتم فحص الحدود قبل استدعاءات صور الذكاء الاصطناعي لإيقاف العمليات المكلفة مبكراً عند نفاد الرصيد.")} />
          <div className="rounded-2xl bg-black/25 p-4 shadow-[inset_0_0_0_1px_rgba(215,196,154,0.08)]">
            <Sparkles className="h-5 w-5 text-diamond-champagne" />
            <p className="font-display mt-4 text-xl text-diamond-pearl">{t("Need more credits?", "تحتاج إلى رصيد إضافي؟")}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {!user
                ? t("Sign in to use monthly bonus credits.", "سجل الدخول لاستخدام الرصيد الإضافي الشهري.")
                : !usage
                  ? t("Loading bonus credit availability...", "جارٍ تحميل الرصيد الإضافي المتاح...")
                  : usage.bonusClaimsRemaining <= 0
                    ? t(
                        "You used both bonus claims. New claims become available next month.",
                        "لقد استخدمت فرصتي الرصيد الإضافي. ستتاح فرص جديدة الشهر القادم."
                      )
                    : usage.canClaimBonus
                      ? t(
                          "Your limit is reached. Add 2 extra image credits now.",
                          "لقد وصلت إلى الحد. أضف رصيدين إضافيين للصور الآن."
                        )
                      : t(
                          `${usage.bonusClaimsRemaining} of 2 monthly claims remain. The button unlocks when your daily or monthly credits reach zero.`,
                          `تبقى ${usage.bonusClaimsRemaining} من فرصتين شهريتين. يتاح الزر عند وصول رصيدك اليومي أو الشهري إلى الصفر.`
                        )}
            </p>
            {usage ? (
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-diamond-champagne/70">
                {t(
                  `${usage.bonusClaimsUsed}/2 bonus claims used this month`,
                  `تم استخدام ${usage.bonusClaimsUsed}/2 من فرص الرصيد الإضافي هذا الشهر`
                )}
              </p>
            ) : null}
            {bonusNotice ? (
              <p className={bonusNotice.type === "error" ? "mt-3 text-sm text-red-300" : "mt-3 text-sm text-diamond-champagne"}>
                {bonusNotice.text}
              </p>
            ) : null}
            <Button
              className="mt-4"
              variant="secondary"
              disabled={!usage?.canClaimBonus || isClaimingBonus}
              onClick={() => void claimBonusCredits()}
            >
              {isClaimingBonus
                ? t("Adding credits...", "جارٍ إضافة الرصيد...")
                : usage?.bonusClaimsRemaining === 0
                  ? t("Monthly claims used", "تم استخدام فرص الشهر")
                  : usage?.canClaimBonus
                    ? t("Claim 2 extra credits", "احصل على رصيدين إضافيين")
                    : t("Available when limit is reached", "يتاح عند الوصول إلى الحد")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreditCard({
  title,
  used,
  limit,
  remaining,
  loading,
  remainingLabel,
  signInLabel,
  usedFromLabel,
  emptyLabel
}: {
  title: string;
  used?: number;
  limit?: number;
  remaining?: number;
  loading: boolean;
  remainingLabel: string;
  signInLabel: string;
  usedFromLabel: (used: number, limit: number) => string;
  emptyLabel: string;
}) {
  const percent = limit && limit > 0 && typeof used === "number" ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-diamond-champagne">
          <Gauge className="h-5 w-5" />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-4xl font-medium text-diamond-pearl">
          {loading ? "..." : typeof remaining === "number" && typeof limit === "number" ? `${remaining}/${limit}` : signInLabel}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{remainingLabel}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-diamond-champagne" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {typeof used === "number" && typeof limit === "number" ? usedFromLabel(used, limit) : emptyLabel}
        </p>
      </CardContent>
    </Card>
  );
}

function LimitNote({
  icon: Icon,
  title,
  description
}: {
  icon: typeof Gem;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-black/25 p-4 shadow-[inset_0_0_0_1px_rgba(215,196,154,0.08)]">
      <Icon className="h-5 w-5 text-diamond-champagne" />
      <p className="font-display mt-4 text-xl text-diamond-pearl">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
