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
            /* eslint-disable-next-line react/no-array-index-key */
            key={i}
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

interface UseAlertResult {
  alert: React.ReactNode;
  setAlert: (alert: unknown, variant?: string) => void;
}

function useAlert(): UseAlertResult {
  const { alerts, addAlert, clearAlerts } = useAlerts();
  return {
    alert: alerts,
    setAlert: (alert, variant) => {
      // TODO: why does this not work?
      clearAlerts();
      if (alert) {
        addAlert(alert, variant);
      }
    },
  };
}

type UseStateHelperResult<T extends object> = [
  T | null,
  (value: T) => void,
  {
    getField: <K extends keyof T>(key: K) => T[K] | null;
    setField: <K extends keyof T>(key: K, value: T[K]) => void;
  }
];

function useStateHelper<T extends object>(initialState: T | null = null): UseStateHelperResult<T> {
  const [state, setState] = useState<T | null>(initialState);
  return [
    state,
    setState,
    {
      getField: (key) => (state === null ? null : state[key]),
      setField: (key, value) => {
        if (state !== null) {
          setState({ ...state, [key]: value });
        }
      },
    },
  ];
}

export { useAlert, useAlerts, useStateHelper };
