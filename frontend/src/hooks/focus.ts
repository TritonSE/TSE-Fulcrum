import { useEffect, useState } from "react";

export function useIsTabFocused() {
  const getIsTabFocused = () => {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible" && document.hasFocus();
  };

  const [isFocused, setIsFocused] = useState(getIsTabFocused);

  useEffect(() => {
    const handleStateChange = () => {
      setIsFocused(getIsTabFocused());
    };

    document.addEventListener("visibilitychange", handleStateChange);
    window.addEventListener("focus", handleStateChange);
    window.addEventListener("blur", handleStateChange);

    return () => {
      document.removeEventListener("visibilitychange", handleStateChange);
      window.removeEventListener("focus", handleStateChange);
      window.removeEventListener("blur", handleStateChange);
    };
  }, []);

  return isFocused;
}
