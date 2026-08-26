import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );

  React.useEffect(() => {
    const mql = typeof window.matchMedia === "function" ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`) : null;
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql?.addEventListener("change", onChange);
    onChange();
    return () => mql?.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
