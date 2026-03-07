export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  duration?: number;
  actions?: Array<{ label: string; onClick?: () => void; role?: 'primary' | 'secondary' }>;
}

let alertService: ((options: AlertOptions) => void) | null = null;

export function setAlertService(service: (options: AlertOptions) => void) {
  alertService = service;
}

export function showAlert(options: AlertOptions) {
  if (alertService) {
    alertService(options);
  } else {
    // very early fallback
    alert(options.title ? `${options.title}\n${options.message}` : options.message);
  }
}

export const Alerts = {
  success(message: string, opts: Omit<AlertOptions, 'message' | 'type'> = {}) {
    showAlert({ message, type: 'success', ...opts });
  },
  error(message: string, opts: Omit<AlertOptions, 'message' | 'type'> = {}) {
    showAlert({ message, type: 'error', ...opts });
  },
  info(message: string, opts: Omit<AlertOptions, 'message' | 'type'> = {}) {
    showAlert({ message, type: 'info', ...opts });
  },
  warning(message: string, opts: Omit<AlertOptions, 'message' | 'type'> = {}) {
    showAlert({ message, type: 'warning', ...opts });
  }
};

