"use client";

import { FormEvent, useState } from "react";
import { LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "./auth-provider";

export function AuthButton() {
  const { user, isConfigured, isLoading, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setStatus("");
    setIsSubmitting(true);
    try {
      await signInWithEmail(email.trim());
      setStatus("Check your email for the magic sign-in link.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-in email could not be sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isConfigured) {
    return (
      <Button variant="secondary" disabled>
        Supabase not configured
      </Button>
    );
  }

  if (user) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:inline">{user.email}</span>
        <Button variant="secondary" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isLoading}>
          <Mail className="h-4 w-4" />
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in with email</DialogTitle>
          <DialogDescription>Use a magic link to save your designs and generate AI concepts.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border bg-background/70 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          {status ? <p className="text-sm leading-6 text-muted-foreground">{status}</p> : null}
          <Button className="w-full" type="submit" disabled={isSubmitting || !email.trim()}>
            {isSubmitting ? "Sending Link..." : "Send Magic Link"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

