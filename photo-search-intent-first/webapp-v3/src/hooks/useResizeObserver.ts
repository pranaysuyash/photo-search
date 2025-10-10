import { useCallback, useEffect, useRef, useState } from "react";

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver<T extends HTMLElement>() {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);
  const elementRef = useRef<T | null>(null);

  const cleanupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  const ref = useCallback((node: T | null) => {
    cleanupObserver();
    elementRef.current = node;

    if (!node) {
      setSize({ width: 0, height: 0 });
      return;
    }

    setSize({ width: node.clientWidth, height: node.clientHeight });

    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observerRef.current.observe(node);
  }, [cleanupObserver]);

  useEffect(() => () => cleanupObserver(), [cleanupObserver]);

  return { ref, size } as const;
}
