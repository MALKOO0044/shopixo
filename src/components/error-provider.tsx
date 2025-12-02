"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";

type ErrorMode = 'visible' | 'silent';

type ErrorContextType = {
  mode: ErrorMode;
  showError: (message: string, errorType?: string, details?: any) => void;
  showWarning: (message: string) => void;
  showSuccess: (message: string) => void;
};

const ErrorContext = createContext<ErrorContextType | null>(null);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<ErrorMode>('visible');
  
  useEffect(() => {
    const fetchMode = async () => {
      try {
        const res = await fetch('/api/admin/errors?limit=0');
        const data = await res.json();
        if (data.ok && data.notificationMode) {
          setMode(data.notificationMode);
        }
      } catch {
      }
    };
    
    fetchMode();
  }, []);
  
  const showError = useCallback((message: string, errorType: string = 'general', details?: any) => {
    if (mode === 'visible') {
      toast({
        title: "Error",
        description: message,
        variant: "error",
        duration: 8000,
      });
    }
    
    fetch('/api/admin/errors/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_type: errorType,
        message,
        details,
        page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      }),
    }).catch(() => {});
  }, [mode, toast]);
  
  const showWarning = useCallback((message: string) => {
    if (mode === 'visible') {
      toast({
        title: "Warning",
        description: message,
        variant: "warning",
        duration: 6000,
      });
    }
  }, [mode, toast]);
  
  const showSuccess = useCallback((message: string) => {
    toast({
      title: "Success",
      description: message,
      variant: "success",
      duration: 3000,
    });
  }, [toast]);
  
  return (
    <ErrorContext.Provider value={{ mode, showError, showWarning, showSuccess }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error("useError must be used within ErrorProvider");
  return ctx;
}
