import { Bell, KeyRound, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/config/public-env";

const settings = [
  {
    icon: Palette,
    title: "Design Preferences",
    description: "Default style, metal tone, and presentation preferences for consultations."
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Controls for design completion and saved concept updates."
  },
  {
    icon: KeyRound,
    title: "Provider Keys",
    description: "Environment-based API credentials prepared for later integration phases."
  }
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-muted-foreground">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Settings</h1>
      </section>
      {publicEnv.demoMode ? (
        <section className="rounded-3xl border border-diamond-champagne/30 bg-diamond-champagne/10 p-5">
          <h2 className="font-semibold text-white">Production warning</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Demo mode is enabled. Set `NEXT_PUBLIC_DEMO_MODE=false` before launching a production deployment.
          </p>
        </section>
      ) : null}
      <section className="grid gap-5 lg:grid-cols-3">
        {settings.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-diamond-champagne">
                <item.icon className="h-5 w-5" />
              </div>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="min-h-16 text-sm leading-6 text-muted-foreground">{item.description}</p>
              <Button className="mt-6 w-full" variant="secondary">
                Configure
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
