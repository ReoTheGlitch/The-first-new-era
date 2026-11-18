import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [key, setKey] = useState(location);
  const [visible, setVisible] = useState(true);
  const prevRef = useRef(location);

  useEffect(() => {
    if (prevRef.current === location) return;
    prevRef.current = location;
    setVisible(false);
    const t = setTimeout(() => {
      setKey(location);
      setVisible(true);
    }, 60);
    return () => clearTimeout(t);
  }, [location]);

  return (
    <div key={key} className={visible ? "page-enter" : "opacity-0"}>
      {children}
    </div>
  );
}
