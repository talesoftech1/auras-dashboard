"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: "",
    website_url: "",
    phone: "",
    contact_email: "",
    trigger_keyword: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setStatus("error");
      setErrorMsg("Your session expired. Please sign in again.");
      return;
    }

    const webhookUrl = process.env.NEXT_PUBLIC_BOT_FACTORY_WEBHOOK_URL;
    if (!webhookUrl) {
      setStatus("error");
      setErrorMsg("Bot Factory webhook URL is not configured.");
      return;
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          owner_user_id: session.user.id,
        }),
      });
      if (!res.ok) throw new Error(`Bot Factory returned ${res.status}`);
      router.replace("/dashboard");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message ?? "Something went wrong.");
    }
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Set up your Auras bot</CardTitle>
          <CardDescription>
            We&apos;ll read your website and create a WhatsApp agent you can
            test in minutes.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Field
              id="company_name"
              label="Business name"
              value={form.company_name}
              onChange={(v) => update("company_name", v)}
              required
            />
            <Field
              id="website_url"
              label="Website URL"
              type="url"
              placeholder="https://"
              value={form.website_url}
              onChange={(v) => update("website_url", v)}
            />
            <Field
              id="phone"
              label="WhatsApp number (with country code)"
              placeholder="+27 ..."
              value={form.phone}
              onChange={(v) => update("phone", v)}
              required
            />
            <Field
              id="contact_email"
              label="Contact email"
              type="email"
              value={form.contact_email}
              onChange={(v) => update("contact_email", v)}
            />
            <Field
              id="trigger_keyword"
              label="Trigger keyword"
              placeholder="e.g. ELI517"
              value={form.trigger_keyword}
              onChange={(v) => update("trigger_keyword", v.toUpperCase())}
              required
            />

            {status === "error" && errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Creating bot..." : "Create my bot"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
