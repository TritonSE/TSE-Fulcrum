import { useState } from "react";
import { Alert } from "react-bootstrap";

interface UseAlertsResult {
  alerts: React.ReactNode;
  addAlert: (alert: unknown, variant?: string) => void;
  clearAlerts: () => void;
}

interface AlertData {
  message: string;
  variant: string;
}

function useAlerts(): UseAlertsResult {
  const [alertList, setAlertList] = useState<AlertData[]>([]);
  return {
    alerts: (
      <div>
        {alertList.map(({ message, variant }, i: number) => (
          <Alert
            variant={variant}
            dismissible
            onClose={() => setAlertList(alertList.filter((_, j) => j !== i))}
          >
            {message}
          </Alert>
        ))}
      </div>
    ),
    addAlert: (message: unknown, variant = "danger") =>
      setAlertList([
        // Show a maximum of 1000 alerts.
        ...alertList.slice(-999),
        { message: "" + message, variant },
      ]),
    clearAlerts: () => setAlertList([]),
  };
}

export { useAlerts };
