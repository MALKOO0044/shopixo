"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

interface SubmitButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "formAction"> {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  // Allow Next.js server actions to be passed through without TS friction
  formAction?: any;
}

export default function SubmitButton({
  label,
  pendingLabel = "Processing...",
  variant = "primary",
  className,
  disabled,
  type,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  const base =
    "inline-flex items-center gap-2 justify-center rounded px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-black text-white hover:bg-gray-800 focus:ring-black",
    secondary: "bg-white text-gray-800 border hover:bg-gray-50 focus:ring-gray-400",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50 focus:ring-red-500",
  };

  return (
    <button
      type={type || "submit"}
      aria-disabled={pending || disabled}
      disabled={pending || disabled}
      className={cn(base, variants[variant] || variants.primary, className)}
      {...rest}
    >
      {pending && (
        <span
          className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}
