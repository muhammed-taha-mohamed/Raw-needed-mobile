import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
  actions?: Array<{ label: string; onClick?: () => void; role?: 'primary' | 'secondary' }>;
}

interface ToastActionsContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showAlert: (options: { message: string; title?: string; type?: ToastType; duration?: number; actions?: Array<{ label: string; onClick?: () => void; role?: 'primary' | 'secondary' }> }) => void;
}

interface ToastStateContextType {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastActionsContext = createContext<ToastActionsContextType | undefined>(undefined);
const ToastStateContext = createContext<ToastStateContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastActionsContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const useToastState = () => {
  const context = useContext(ToastStateContext);
  if (!context) {
    throw new Error('useToastState must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showAlert = useCallback((options: { message: string; title?: string; type?: ToastType; duration?: number; actions?: Array<{ label: string; onClick?: () => void; role?: 'primary' | 'secondary' }> }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const { message, title, type = 'error', duration = 5000, actions } = options;
    const newToast: Toast = { id, message, type, duration, title, actions };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showToast = useCallback((message: string, type: ToastType = 'error', duration: number = 5000) => {
    showAlert({ message, type, duration });
  }, [showAlert]);

  const actionsValue = useMemo(
    () => ({ showToast, showAlert }),
    [showToast, showAlert]
  );

  const stateValue = useMemo(
    () => ({ toasts, removeToast }),
    [toasts, removeToast]
  );

  return (
    <ToastActionsContext.Provider value={actionsValue}>
      <ToastStateContext.Provider value={stateValue}>
        {children}
      </ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
};
