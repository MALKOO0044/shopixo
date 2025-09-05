"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast-provider";

export default function FormStatusToast({
  successMessage = "تم الحفظ بنجاح",
  successTitle,
}: {
  successMessage?: string;
  successTitle?: string;
}) {
  const { pending } = useFormStatus();
  const { toast } = useToast();
  const prev = useRef(pending);

  useEffect(() => {
    // Show success when we transition from pending -> not pending
    if (prev.current && !pending) {
      toast({ variant: "success", title: successTitle, description: successMessage });
    }
    prev.current = pending;
  }, [pending, toast, successMessage, successTitle]);

  return null;
}
