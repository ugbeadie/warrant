import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, TriangleAlert, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextType {
  toast: Record<ToastVariant, (message: string) => void>;
  dismissToast: (id: number) => void;
}

const TOAST_DURATION_MS = 4000;
// Older toasts drop off the top so a burst of actions can't cover the viewport.
const MAX_VISIBLE_TOASTS = 4;

const VARIANT_STYLES: Record<
  ToastVariant,
  { label: string; accent: string; icon: ReactNode }
> = {
  success: {
    label: "Success",
    accent: "text-success",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  error: {
    label: "Error",
    accent: "text-danger",
    icon: <TriangleAlert className="w-3.5 h-3.5" />,
  },
  info: {
    label: "Info",
    accent: "text-brand",
    icon: <Info className="w-3.5 h-3.5" />,
  },
};

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId.current++;
      setToasts((prev) =>
        [...prev, { id, variant, message }].slice(-MAX_VISIBLE_TOASTS),
      );
      timers.current.set(
        id,
        setTimeout(() => dismissToast(id), TOAST_DURATION_MS),
      );
    },
    [dismissToast],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const toast = useMemo(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
      info: (message: string) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-60 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto animate-toast-in flex items-start gap-2.5 rounded-lg border border-border-dark bg-surface-raised px-3.5 py-3 shadow-lg"
            >
              <span className={`shrink-0 mt-px ${style.accent}`}>
                {style.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[10px] font-mono uppercase tracking-widest ${style.accent}`}
                >
                  {style.label}
                </p>
                <p className="mt-1 text-sm text-on-dark leading-snug wrap-break-word">
                  {t.message}
                </p>
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-on-dark-muted cursor-pointer hover:text-on-dark transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
