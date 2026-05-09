"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MagicLinkFormProps {
  title: string;
  description: string;
  submitLabel: string;
  /** What we show inline once the email has been sent. */
  successMessage: string;
  /** Path on this site to land on after the link is clicked. e.g. "/onboarding" */
  next: string;
  /** Optional small line below the card for the alternate path (login ↔ signup). */
  footer?: React.ReactNode;
}

/**
 * Shared sign-in / sign-up form. With magic-link auth the actual flow is the
 * same in both directions — Supabase creates a user on first click and signs
 * them in on every subsequent click. The two pages just differ in copy +
 * post-click destination.
 */
export function MagicLinkForm({
  title,
  description,
  submitLabel,
  successMessage,
  next,
  footer,
}: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "sending" || status === "sent"}
                />
              </div>

              {status === "sent" && (
                <p className="text-sm text-primary">{successMessage}</p>
              )}
              {status === "error" && errorMsg && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={status === "sending" || status === "sent"}
              >
                {status === "sending"
                  ? "Sending..."
                  : status === "sent"
                    ? "Link sent"
                    : submitLabel}
              </Button>
            </CardFooter>
          </form>
        </Card>
        {footer && (
          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        )}
      </div>
    </main>
  );
}
