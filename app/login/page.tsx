"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MagicLinkForm } from "@/components/auth/magic-link-form";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginShell />
    </Suspense>
  );
}

function LoginShell() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  return (
    <MagicLinkForm
      title="Sign in to Auras"
      description="We'll email you a secure link. No password needed."
      submitLabel="Email me a sign-in link"
      successMessage="Check your inbox for a sign-in link."
      next={next}
      footer={
        <>
          New to Auras?{" "}
          <Link href="/signup" className="underline underline-offset-4">
            Create an account
          </Link>
          .
        </>
      }
    />
  );
}
