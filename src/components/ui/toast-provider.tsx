"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";
export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastInternal = Required<Omit<ToastOptions, "duration">> & {
  id: number;
  duration: number;
};

const ToastContext = createContext<{
  toast: (opts: ToastOptions) => number;
  dismiss: (id: number) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: ToastOptions) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const t: ToastInternal = {
      id,
      title: opts.title ?? "",
      description: opts.description ?? "",
      variant: opts.variant ?? "info",
      duration: opts.duration ?? 3500,
    };
    setToasts((prev) => [...prev, t]);
    return id;
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        dismiss(t.id);
      }, t.duration)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function Toaster({ toasts, onDismiss }: { toasts: ToastInternal[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastInternal; onDismiss: () => void }) {
  const variantClasses: Record<ToastVariant, string> = {
    success: "border-green-300 text-green-900",
    error: "border-red-300 text-red-900",
    info: "border-blue-300 text-blue-900",
    warning: "border-yellow-300 text-yellow-900",
  };

  const title = toast.title || (toast.variant === "success" ? "Success" : toast.variant === "error" ? "Error" : "Notice");

  return (
    <div className={cn("pointer-events-auto overflow-hidden rounded-md border bg-white shadow-md", variantClasses[toast.variant])}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold">{title}</p>
            {toast.description ? (
              <p className="mt-1 text-xs text-gray-700">{toast.description}</p>
            ) : null}
          </div>
          <button onClick={onDismiss} className="text-xs text-gray-500 hover:text-gray-800" aria-label="Close">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
