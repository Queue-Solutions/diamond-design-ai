"use client";

import Link from "next/link";
import { Gem, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { navigationItems } from "@/config/navigation";
import { AuthButton } from "@/components/auth/auth-button";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-3 lg:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-6 translate-y-0 sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Navigation</DialogTitle>
              </DialogHeader>
              <nav className="grid gap-2 pt-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl border bg-white/[0.035] px-4 py-3 text-sm text-muted-foreground transition hover:bg-white/[0.07] hover:text-white"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </nav>
            </DialogContent>
          </Dialog>
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <Gem className="h-5 w-5 text-diamond-champagne" />
            Diamond AI
          </Link>
        </div>
        <div className="hidden min-w-0 flex-1 items-center rounded-full border bg-white/[0.035] px-4 py-3 text-muted-foreground md:flex lg:max-w-md">
          <Search className="mr-3 h-4 w-4" />
          <span className="truncate text-sm">Search designs, versions, and settings</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/gallery">View Gallery</Link>
          </Button>
          <Button asChild>
            <Link href="/chat">New Design</Link>
          </Button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
