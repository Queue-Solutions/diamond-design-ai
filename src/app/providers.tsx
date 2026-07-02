"use client";

import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-provider";
import { LanguageProvider } from "@/lib/language";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
