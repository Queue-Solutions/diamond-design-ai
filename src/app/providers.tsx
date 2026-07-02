"use client";

import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <ToastViewport />
      </ToastProvider>
    </AuthProvider>
  );
}
