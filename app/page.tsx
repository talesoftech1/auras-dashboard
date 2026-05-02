import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center space-y-8">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Beta · R299/month · South Africa
        </div>
        <h1 className="text-5xl font-semibold tracking-tight">
          A WhatsApp AI agent that knows your business.
        </h1>
        <p className="text-lg text-muted-foreground">
          Auras answers customers on WhatsApp 24/7 using everything on your
          website, documents and FAQs. Set it up in minutes.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
          <a
            href="https://wa.me/27774014747"
            className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-8 text-sm font-medium shadow-sm hover:bg-accent"
          >
            Talk to us on WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
