import { useState } from "react";

import Alert from "../components/Alert";

import type { Variant } from "../components/Alert";

type UseAlertsResult = {
  alerts: React.ReactNode;
  addAlert: (alert: unknown, variant?: Variant) => void;
  clearAlerts: () => void;
};

type AlertData = {
  message: string;
  variant: Variant;
};

function useAlerts(): UseAlertsResult {
  const [alertList, setAlertList] = useState<AlertData[]>([]);

  return {
    alerts: (
      <div className="tw:absolute tw:overflow-x-hideen tw:overflow-y-auto tw:top-[50px] tw:right-[20px] tw:z-50 tw:max-w-[500px] tw:max-h-[50%]">
        {alertList.map(({ message, variant }, i: number) => (
          <Alert
            /* eslint-disable-next-line react/no-array-index-key */
            key={i}
            className="tw:shadow-md"
            variant={variant}
            onClose={() => setAlertList(alertList.filter((_, j) => j !== i))}
          >
            {message}
          </Alert>
        ))}
      </div>
    ),
    addAlert: (message: unknown, variant = "danger") =>
      setAlertList((prev) => [
        // Show a maximum of 1000 alerts.
        ...prev.slice(-999),
        { message: `${message as string}`, variant },
      ]),
    clearAlerts: () => setAlertList([]),
  };
}

type UseAlertResult = {
  alert: React.ReactNode;
  setAlert: (alert: unknown, variant?: Variant) => void;
};

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
  },
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
