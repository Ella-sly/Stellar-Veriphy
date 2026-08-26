"use client";

import { createContext, useCallback, useContext, useEffect,useState } from "react";
import { FiAlertCircle, FiAlertTriangle,FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

import { cn } from "@/utils/cn";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

type ToastPosition =
  "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

interface ToastOptions {
  type?: ToastType;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  position?: ToastPosition;
}

const ToastContext = createContext<{
  toast: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  dismissAll: () => void;
}>({
  toast: () => 0,
  dismiss: () => {},
  dismissAll: () => {},
});

let nextId = 0;

const typeIcons = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  info: FiInfo,
  warning: FiAlertTriangle,
};

const typeColors = {
  success: "bg-green-500 border-green-400",
  error: "bg-red-500 border-red-400",
  info: "bg-blue-500 border-blue-400",
  warning: "bg-yellow-500 border-yellow-400",
};

const typeTextColors = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
};

const positionClasses: Record<ToastPosition, string> = {
  "top-left": "top-4 left-4",
  "top-center": "top-4 left-1/2 transform -translate-x-1/2",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2",
  "bottom-right": "bottom-4 right-4",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [position, setPosition] = useState<ToastPosition>("bottom-right");

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = ++nextId;
      const {
        type = "info",
        title,
        action,
        duration = 4000,
        position: toastPosition = "bottom-right",
      } = options;

      if (toastPosition !== position) {
        setPosition(toastPosition);
      }

      const newToast: Toast = {
        id,
        message,
        type,
        duration,
        ...(title !== undefined ? { title } : {}),
        ...(action !== undefined ? { action } : {}),
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      // Announce to screen readers
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `${type}: ${title ? `${title} - ` : ""}${message}`;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 100);

      return id;
    },
    [position]
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Limit maximum toasts
  useEffect(() => {
    if (toasts.length > 5) {
      setToasts((prev) => prev.slice(-5));
    }
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      {children}

      {/* Toast container */}
      <div
        className={cn(
          "fixed z-[100] flex flex-col gap-3 max-w-sm w-full",
          positionClasses[position]
        )}
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = typeIcons[toast.type];
          return (
            <div
              key={toast.id}
              className={cn(
                "relative flex items-start gap-3 p-4 rounded-lg shadow-lg border",
                "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                "animate-in fade-in slide-in-from-bottom-5 duration-200",
                "transform transition-all hover:scale-[1.02] hover:shadow-xl",
                typeColors[toast.type]
              )}
              role="alert"
              aria-label={`${toast.type} notification`}
            >
              {/* Icon */}
              <div className={cn("flex-shrink-0", typeTextColors[toast.type])}>
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {toast.title}
                  </h4>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-300">{toast.message}</p>

                {/* Action button */}
                {toast.action && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        toast.action?.onClick();
                        dismiss(toast.id);
                      }}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-offset-2",
                        toast.type === "success" &&
                          "bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500",
                        toast.type === "error" &&
                          "bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500",
                        toast.type === "info" &&
                          "bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500",
                        toast.type === "warning" &&
                          "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-500"
                      )}
                      aria-label={`Perform action: ${toast.action.label}`}
                    >
                      {toast.action.label}
                    </button>
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() => dismiss(toast.id)}
                className={cn(
                  "flex-shrink-0 p-1 rounded-md transition-colors",
                  "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                  "hover:bg-gray-100 dark:hover:bg-gray-700",
                  "focus:outline-none focus:ring-2 focus:ring-gray-400"
                )}
                aria-label="Dismiss notification"
              >
                <FiX className="w-4 h-4" aria-hidden="true" />
              </button>

              {/* Progress bar */}
              {toast.duration && toast.duration > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 overflow-hidden rounded-b-lg"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={toast.duration}
                  aria-valuenow={toast.duration}
                  aria-label="Notification timeout progress"
                >
                  <div
                    className={cn(
                      "h-full transition-all duration-linear",
                      typeColors[toast.type].split(" ")[0]
                    )}
                    style={{
                      width: "100%",
                      animation: `shrink ${toast.duration}ms linear forwards`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// Create a separate hook for toast helpers
export const useToastHelpers = () => {
  const { toast, dismiss, dismissAll } = useToast();

  return {
    success: (message: string, options?: Omit<ToastOptions, "type">) =>
      toast(message, { ...options, type: "success" }),

    error: (message: string, options?: Omit<ToastOptions, "type">) =>
      toast(message, { ...options, type: "error" }),

    info: (message: string, options?: Omit<ToastOptions, "type">) =>
      toast(message, { ...options, type: "info" }),

    warning: (message: string, options?: Omit<ToastOptions, "type">) =>
      toast(message, { ...options, type: "warning" }),

    dismiss,
    dismissAll,
  };
};

// For global access - this creates a toast instance that can be imported
// but should be initialized with the toast context from useToast()
export const createToastHelpers = (toastContext: ReturnType<typeof useToast>) => ({
  success: (message: string, options?: Omit<ToastOptions, "type">) =>
    toastContext.toast(message, { ...options, type: "success" }),

  error: (message: string, options?: Omit<ToastOptions, "type">) =>
    toastContext.toast(message, { ...options, type: "error" }),

  info: (message: string, options?: Omit<ToastOptions, "type">) =>
    toastContext.toast(message, { ...options, type: "info" }),

  warning: (message: string, options?: Omit<ToastOptions, "type">) =>
    toastContext.toast(message, { ...options, type: "warning" }),

  dismiss: (id: number) => toastContext.dismiss(id),
  dismissAll: () => toastContext.dismissAll(),
});
