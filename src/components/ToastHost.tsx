'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { Toast } from '@/hooks/useTracker';

interface ToastHostProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[90] space-y-2 max-w-sm" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 shadow-lg text-xs font-semibold bg-white ${
            t.kind === 'error' ? 'border-red-200 text-red-800' : 'border-emerald-200 text-emerald-800'
          }`}
        >
          {t.kind === 'error' ? (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
          )}
          <span className="flex-1 leading-relaxed">{t.message}</span>
          <button type="button" onClick={() => onDismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="ปิด">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
