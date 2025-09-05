"use client";

import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactForm() {
  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value || "";
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value || "";
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement)?.value || "";

    const subject = encodeURIComponent(`رسالة من ${name || "زائر"}`);
    const body = encodeURIComponent([
      `الاسم: ${name}`,
      `البريد: ${email}`,
      "",
      message,
    ].join("\n"));

    const mailto = `mailto:support@shopixo.com?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  }, []);

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4 max-w-2xl">
      <Input name="name" placeholder="الاسم الكامل" required />
      <Input name="email" type="email" placeholder="البريد الإلكتروني" required />
      <Textarea name="message" placeholder="رسالتك" rows={6} required />
      <button type="submit" className="btn-primary w-fit">إرسال الرسالة</button>
    </form>
  );
}
