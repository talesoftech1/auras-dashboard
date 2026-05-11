import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Bot } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";
import { createBot } from "./actions";

const SHARED_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_AURAS_WHATSAPP_NUMBER ?? "";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: rawBot } = await supabase
    .from("bots")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const bot = rawBot as Bot | null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 sm:mb-8">
        <Link href="/dashboard" className="text-lg font-semibold">
          Auras
        </Link>
        <h1 className="mt-5 text-2xl font-semibold sm:mt-6 sm:text-3xl">
          {bot ? "Try out your bot" : "Welcome to Auras"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {bot
            ? "Your bot is live on the shared Auras WhatsApp number. Here's how to chat with it."
            : "Two short steps and your AI assistant will be ready to test on WhatsApp."}
        </p>
      </header>

      <Stepper currentStep={bot ? 2 : 1} />

      <section className="mt-6 rounded-xl border bg-card p-5 shadow-sm sm:mt-8 sm:p-6">
        {bot === null ? (
          <BusinessForm userEmail={user.email ?? ""} />
        ) : (
          <TestDriveScreen bot={bot} />
        )}
      </section>
    </main>
  );
}

function Stepper({ currentStep }: { currentStep: 1 | 2 }) {
  const steps = [
    { n: 1, label: "Business" },
    { n: 2, label: "Try it on WhatsApp" },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted-foreground">
      {steps.map((s, i) => {
        const done = currentStep > s.n;
        const active = currentStep === s.n;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium " +
                (done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-muted")
              }
            >
              {done ? "✓" : s.n}
            </span>
            <span
              className={
                "whitespace-nowrap " +
                (active ? "font-medium text-foreground" : "")
              }
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className="mx-1 hidden h-px w-6 bg-border sm:inline-block"
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function BusinessForm({ userEmail }: { userEmail: string }) {
  return (
    <form action={createBot} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Tell us about your business</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll spin up your bot on the shared Auras number so you can
          test it in seconds. You can fine-tune everything later.
        </p>
      </div>

      <Field
        id="company_name"
        label="Business name"
        placeholder="Mango Café"
        required
      />
      <Field
        id="website_url"
        label="Website (optional)"
        type="text"
        placeholder="mangocafe.co.za"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        hint="Type it however — mangocafe.co.za, www.mangocafe.co.za, or with https://. We'll figure it out."
      />
      <Field
        id="contact_phone"
        label="Your contact number (optional)"
        placeholder="+27 82 123 4567"
        hint="So we can reach you if anything goes wrong."
      />

      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        Signed in as <span className="font-medium">{userEmail}</span>. We&apos;ll
        send order updates and account emails here.
      </div>

      <SubmitButton
        pendingText="Setting up your bot..."
        className="h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Continue
      </SubmitButton>
    </form>
  );
}

function TestDriveScreen({ bot }: { bot: Bot }) {
  const code = bot.trigger_keyword ?? "";
  const cleanedNumber = SHARED_WHATSAPP_NUMBER.replace(/[^0-9]/g, "");
  // First message has to be ONLY the code so Inbound Handler can claim the
  // bot to this customer's phone. After that they can chat normally.
  const waLink = cleanedNumber
    ? `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(code)}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Your bot is ready to chat</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ve set up{" "}
          <span className="font-medium text-foreground">
            {bot.company_name}
          </span>
          &apos;s assistant on the shared Auras WhatsApp number. Send the code
          below to claim your bot — after that you can chat with it normally.
        </p>
      </div>

      <div className="rounded-md border bg-muted/40 p-5 text-center sm:p-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Your bot&apos;s code
        </div>
        <div className="mt-2 break-all font-mono text-3xl font-bold tracking-[0.25em] sm:text-4xl sm:tracking-[0.4em]">
          {code}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Save this — you&apos;ll need it any time you test from a new phone.
        </div>
      </div>

      <ol className="space-y-3 rounded-md border p-4 text-sm sm:p-5">
        <Step n={1}>Open WhatsApp on your phone.</Step>
        <Step n={2}>
          Send a message to{" "}
          <span className="break-all font-mono">
            {SHARED_WHATSAPP_NUMBER ||
              "your Auras number (set NEXT_PUBLIC_AURAS_WHATSAPP_NUMBER)"}
          </span>{" "}
          containing only the code{" "}
          <span className="font-mono font-bold">{code}</span> on its own. This
          claims the bot for your phone number.
        </Step>
        <Step n={3}>
          The bot will reply. From there, chat with it normally — ask about
          prices, hours, anything a real customer would.
        </Step>
      </ol>

      <div className="space-y-3">
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open WhatsApp with the code pre-filled
          </a>
        )}
        <Link
          href="/dashboard"
          className="inline-flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm hover:bg-muted"
        >
          Go to dashboard
        </Link>
      </div>

      <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        Want your bot on your own WhatsApp Business number instead of the
        shared one? Once you&apos;ve had a play, head to{" "}
        <Link href="/dashboard/settings" className="underline">
          Settings
        </Link>{" "}
        and request a dedicated number.
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Field({
  id,
  label,
  type = "text",
  placeholder,
  required,
  hint,
  inputMode,
  autoCapitalize,
  autoCorrect,
  spellCheck,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: string;
  autoCorrect?: string;
  spellCheck?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
