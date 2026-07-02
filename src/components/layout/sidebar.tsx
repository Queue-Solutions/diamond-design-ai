import Link from "next/link";
import { Gem } from "lucide-react";
import { navigationItems } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r bg-black/55 p-5 backdrop-blur-xl lg:block">
      <Link href="/" className="flex items-center gap-3 px-2 py-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Gem className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-white">Diamond AI</p>
          <p className="text-xs text-muted-foreground">Design Atelier</p>
        </div>
      </Link>

      <nav className="mt-8 space-y-2">
        {navigationItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-white"
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>

      <Card className="absolute bottom-5 left-5 right-5 bg-white/[0.045]">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-white">Phase 1 Foundation</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            UI shell, routes, components, and provider contracts are ready for the next integration phase.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
