"use client";

import { useToast, type Toast } from "~/context/ToastContext";

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();

  const bgColors = {
    success: "bg-green-50 border-green-900",
    error: "bg-red-50 border-red-900",
    info: "bg-blue-50 border-blue-900",
    warning: "bg-yellow-50 border-yellow-900",
  };

  const textColors = {
    success: "text-green-900",
    error: "text-red-900",
    info: "text-blue-900",
    warning: "text-yellow-900",
  };

  return (
    <div
      className={`${bgColors[toast.type]} ${textColors[toast.type]} pointer-events-auto mb-3 flex min-w-[300px] max-w-[400px] items-start justify-between border-3 p-4 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-right-full`}
      role="alert"
    >
      <div className="flex-1 pr-3">
        <p className="font-bold">
          {toast.type === "success" && "✓"}
          {toast.type === "error" && "✗"}
          {toast.type === "info" && "ℹ"}
          {toast.type === "warning" && "⚠"}
          <span className="ml-2">{toast.message}</span>
        </p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-current hover:opacity-70 transition-opacity ml-2 flex-shrink-0"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col items-end"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
