"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text to show while the form is being submitted. Defaults to children. */
  pendingText?: ReactNode;
}

/**
 * A submit button that automatically reflects its parent <form>'s pending
 * state via React's useFormStatus. Disables and dims while the action is
 * in flight, swaps the label to `pendingText` if supplied.
 */
export function SubmitButton({
  children,
  className,
  pendingText,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={cn(
        "transition-opacity",
        isDisabled && "cursor-wait opacity-60",
        className
      )}
      {...props}
    >
      {pending && pendingText !== undefined ? pendingText : children}
    </button>
  );
}
