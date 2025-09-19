import type React from "react";
import ErrorBoundary from "./ErrorBoundary";
import { HintProvider } from "./HintSystem";
import { ResultsConfigProvider } from "../contexts/ResultsConfigContext";
import { ResultsUIProvider } from "../contexts/ResultsUIContext";
import { ThemeProvider } from "./ThemeProvider";
import type { ResultView } from "../contexts/ResultsConfigContext";

interface AppProvidersProps {
  children: React.ReactNode;
  resultView: ResultView;
  setResultView: (view: ResultView) => void;
  timelineBucket: "day" | "week" | "month";
  setTimelineBucket: (bucket: "day" | "week" | "month") => void;
  selected: Set<string>;
  setSelected: (selected: Set<string>) => void;
  toggleSelect: (path: string) => void;
  focusIdx: number | null;
  setFocusIdx: (idx: number | null) => void;
  detailIdx: number | null;
  setDetailIdx: (idx: number | null) => void;
  layoutRowsRef: React.MutableRefObject<number[][]>;
  setLayoutRows: (rows: number[][]) => void;
}

export function AppProviders({
  children,
  resultView,
  setResultView,
  timelineBucket,
  setTimelineBucket,
  selected,
  setSelected,
  toggleSelect,
  focusIdx,
  setFocusIdx,
  detailIdx,
  setDetailIdx,
  layoutRowsRef,
  setLayoutRows,
}: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <HintProvider>
          <ResultsConfigProvider
            value={{
              resultView: resultView as "grid" | "film" | "timeline" | "map",
              setResultView: (v: ResultView) => {
                setResultView(v);
                // Note: settingsActions.setResultView will be handled by parent
              },
              timelineBucket,
              setTimelineBucket: (b: "day" | "week" | "month") => {
                setTimelineBucket(b);
                // Note: settingsActions.setTimelineBucket will be handled by parent
              },
            }}
          >
            <ResultsUIProvider
              value={{
                selected,
                setSelected,
                toggleSelect,
                focusIdx,
                setFocusIdx,
                detailIdx,
                setDetailIdx,
                layoutRowsRef,
                setLayoutRows,
              }}
            >
              {children}
            </ResultsUIProvider>
          </ResultsConfigProvider>
        </HintProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
