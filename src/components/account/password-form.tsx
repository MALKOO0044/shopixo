"use client";

import React, { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import SubmitButton from "@/components/submit-button";
import FormStatusToast from "@/components/form-status-toast";

interface PasswordFormProps {
  action: (formData: FormData) => Promise<void> | void;
}

export default function PasswordForm({ action }: PasswordFormProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [show, setShow] = useState(false);

  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const newPassword = (form.elements.namedItem("new_password") as HTMLInputElement)?.value || "";
    const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement)?.value || "";

    if (newPassword.length < 8) {
      e.preventDefault();
      toast({ variant: "error", description: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirm) {
      e.preventDefault();
      toast({ variant: "error", description: "Passwords do not match." });
      return;
    }
  }, [toast]);

  return (
    <form ref={formRef} action={action} className="space-y-3 max-w-md" noValidate onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-medium mb-1">New Password</label>
        <div className="relative">
          <input
            name="new_password"
            type={show ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded border px-3 py-2 pr-16"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:text-black"
            aria-label={show ? "Hide" : "Show"}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Confirm Password</label>
        <input
          name="confirm_password"
          type={show ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded border px-3 py-2"
          placeholder="••••••••"
        />
      </div>
      <SubmitButton label="Update Password" pendingLabel="Updating..." />
      <FormStatusToast successMessage="Password updated" />
    </form>
  );
}
