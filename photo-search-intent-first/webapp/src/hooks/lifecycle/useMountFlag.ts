/**
 * Handles component mount lifecycle, skip-to-content functionality
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export interface UseMountFlagReturn {
  isMounted: boolean;
  skipToContentRef: RefObject<HTMLAnchorElement>;
  skipToContent: () => void;
}

export function useMountFlag(): UseMountFlagReturn {
  const [isMounted, setIsMounted] = useState(false);
  const skipToContentRef = useRef<HTMLAnchorElement>(null);

  const skipToContent = useCallback(() => {
    skipToContentRef.current?.click();
  }, []);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  return {
    isMounted,
    skipToContentRef,
    skipToContent,
  };
}
