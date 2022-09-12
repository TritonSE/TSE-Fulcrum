import { createContext, useMemo } from "react";
import { Alert } from "react-bootstrap";

interface ErrorContextFields {
  error: string;
  setError: (error: unknown) => void;
}

const ErrorContext = createContext<ErrorContextFields>({
  error: "",
  // We only use this if a component doesn't have an enclosing ErrorScope.
  // eslint-disable-next-line no-console
  setError: console.error,
});

interface ErrorScopeProps extends ErrorContextFields {
  children: React.ReactNode;
}

function ErrorScope({ error, setError, children }: ErrorScopeProps) {
  const context = useMemo<ErrorContextFields>(
    () => ({ error, setError: (input: unknown) => setError("" + input) }),
    [error, setError]
  );
  return (
    <ErrorContext.Provider value={context}>
      <>
        {error && (
          <Alert variant="danger" dismissible>
            <pre>{error}</pre>
          </Alert>
        )}
        {children}
      </>
    </ErrorContext.Provider>
  );
}

export { ErrorContext, ErrorScope };
