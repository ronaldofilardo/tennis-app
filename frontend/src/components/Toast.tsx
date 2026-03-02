// frontend/src/components/Toast.tsx
// === AREA 4: UI Theming — Substituição de alert() nativo ===
// Componente de notificação global "themeable" para White Label.
// Substitui window.alert() que bloqueia a thread e não é customizável.

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { ReactNode } from "react";
import "./Toast.css";

// === Tipos ===

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  /** Auto-dismiss (padrão: true) */
  autoDismiss?: boolean;
}

interface ToastContextType {
  /** Exibe uma notificação */
  showToast: (
    message: string,
    type?: ToastType,
    options?: Partial<ToastMessage>,
  ) => void;
  /** Atalhos tipados */
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  /** Remove uma notificação */
  dismiss: (id: string) => void;
  /** Remove todas */
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastCounter = 0;

// === Provider ===

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      options: Partial<ToastMessage> = {},
    ) => {
      toastCounter++;
      const id = `toast_${Date.now()}_${toastCounter}`;
      const toast: ToastMessage = {
        id,
        type,
        message,
        duration: options.duration ?? 4000,
        autoDismiss: options.autoDismiss ?? true,
        title: options.title,
      };
      setToasts((prev) => [...prev, toast]);
    },
    [],
  );

  const success = useCallback(
    (message: string, title?: string) =>
      showToast(message, "success", { title }),
    [showToast],
  );
  const error = useCallback(
    (message: string, title?: string) =>
      showToast(message, "error", { title, duration: 6000 }),
    [showToast],
  );
  const warning = useCallback(
    (message: string, title?: string) =>
      showToast(message, "warning", { title }),
    [showToast],
  );
  const info = useCallback(
    (message: string, title?: string) => showToast(message, "info", { title }),
    [showToast],
  );

  const value: ToastContextType = {
    showToast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// === Hook ===

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// === Toast Container ===

const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// === Toast Item ===

const ToastItem: React.FC<{
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.autoDismiss !== false && toast.duration) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300); // animation duration
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const icon = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  }[toast.type];

  return (
    <div
      className={`toast-item toast-${toast.type} ${isExiting ? "toast-exit" : "toast-enter"}`}
      role="status"
    >
      <span className="toast-icon">{icon}</span>
      <div className="toast-content">
        {toast.title && <strong className="toast-title">{toast.title}</strong>}
        <span className="toast-message">{toast.message}</span>
      </div>
      <button
        className="toast-dismiss"
        onClick={handleDismiss}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </div>
  );
};

export default ToastProvider;
