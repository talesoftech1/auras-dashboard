"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MagicLinkForm } from "@/components/auth/magic-link-form";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupShell />
    </Suspense>
  );
}

function SignupShell() {
  // After they click the magic link we want a brand-new user to land on the
  // onboarding wizard, not the dashboard root (which redirects them anyway).
  // A `?next=` query param can still override this if the marketing site
  // wants to deep-link people somewhere specific.
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/onboarding";

  return (
    <MagicLinkForm
      title="Get started with Auras"
      description="Enter your email and we'll send you a sign-in link. No password to remember."
      submitLabel="Email me a sign-up link"
      successMessage="Check your inbox — click the link to finish setting up your account."
      next={next}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
          .
        </>
      }
    />
  );
}
