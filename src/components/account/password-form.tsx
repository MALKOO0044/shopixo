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
      toast({ variant: "error", description: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل." });
      return;
    }
    if (newPassword !== confirm) {
      e.preventDefault();
      toast({ variant: "error", description: "كلمتا المرور غير متطابقتين." });
      return;
    }
  }, [toast]);

  return (
    <form ref={formRef} action={action} className="space-y-3 max-w-md" noValidate onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-medium mb-1">كلمة المرور الجديدة</label>
        <div className="relative">
          <input
            name="new_password"
            type={show ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded border px-3 py-2 pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:text-black"
            aria-label={show ? "إخفاء" : "إظهار"}
          >
            {show ? "إخفاء" : "إظهار"}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">تأكيد كلمة المرور</label>
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
      <SubmitButton label="تحديث كلمة المرور" pendingLabel="جارٍ التحديث..." />
      <FormStatusToast successMessage="تم تحديث كلمة المرور" />
    </form>
  );
}
