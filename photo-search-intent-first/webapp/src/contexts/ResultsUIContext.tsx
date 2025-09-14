import React, { createContext, useContext } from "react";

export interface ResultsUIValue {
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  toggleSelect: (path: string) => void;

  focusIdx: number | null;
  setFocusIdx: (i: number | null) => void;

  detailIdx: number | null;
  setDetailIdx: (i: number | null) => void;

  layoutRowsRef: React.MutableRefObject<number[][]>;
  setLayoutRows: (rows: number[][]) => void;
}

const Ctx = createContext<ResultsUIValue | null>(null);

export function ResultsUIProvider({
  value,
  children,
}: {
  value: ResultsUIValue;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResultsUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useResultsUI must be used within ResultsUIProvider");
  return v;
}

