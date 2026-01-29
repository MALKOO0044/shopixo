"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function CartToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  useEffect(() => {
    const handleToast = (e: CustomEvent<{ message: string; type: 'success' | 'error' }>) => {
      const id = Date.now();
      const newToast: Toast = {
        id,
        message: e.detail.message,
        type: e.detail.type || 'success'
      };
      
      setToasts(prev => [...prev, newToast]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
    
    window.addEventListener('show-toast', handleToast as EventListener);
    return () => {
      window.removeEventListener('show-toast', handleToast as EventListener);
    };
  }, []);
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } animate-in slide-in-from-right duration-200`}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
