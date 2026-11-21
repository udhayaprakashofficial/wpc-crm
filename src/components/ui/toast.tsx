"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ToastItem = { id: number; message: string };

const ToastContext = createContext<{
  showSuccess: (message: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showSuccess = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showSuccess }}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(100%-2rem,20rem)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            message={toast.message}
            onDone={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-auto animate-[toast-in_0.25s_ease-out] rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
