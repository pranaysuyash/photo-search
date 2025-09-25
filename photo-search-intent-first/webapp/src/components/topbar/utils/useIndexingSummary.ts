import { useMemo } from "react";

import type { IndexStatusDetails } from "../../../contexts/LibraryContext";
import { humanizeSeconds } from "../../../utils/time";
import { formatEta, normalizePct, ratePerMinuteStr } from "./format";

type Diagnostics = {
  engines?: Array<{ key: string; index_dir: string; count: number }>;
} | null;

interface UseIndexingSummaryParams {
  diag?: Diagnostics;
  indexedCount?: number;
  indexedTotal?: number;
  coveragePct?: number;
  indexStatus?: IndexStatusDetails;
  etaSeconds?: number;
  tooltip?: string;
}

export interface IndexingSummary {
  rawIndexedCount?: number;
  formattedIndexedCount?: string;
  formattedTotal?: string;
  coverageText?: string;
  etaInline?: string;
  rateInline?: string;
  lastIndexedText?: string;
  tooltipLines: string[];
  showIndexChip: boolean;
}

export function useIndexingSummary({
  diag,
  indexedCount,
  indexedTotal,
  coveragePct,
  indexStatus,
  etaSeconds,
  tooltip,
}: UseIndexingSummaryParams): IndexingSummary {
  return useMemo(() => {
    const numberFormatter = new Intl.NumberFormat();

    const rawIndexedCount =
      typeof indexedCount === "number" && !Number.isNaN(indexedCount)
        ? indexedCount
        : diag?.engines?.[0]?.count;

    const totalForDisplay =
      typeof indexedTotal === "number" && !Number.isNaN(indexedTotal)
        ? indexedTotal
        : indexStatus?.target;

    const formattedIndexedCount =
      typeof rawIndexedCount === "number"
        ? numberFormatter.format(rawIndexedCount)
        : undefined;

    const formattedTotal =
      typeof totalForDisplay === "number"
        ? numberFormatter.format(totalForDisplay)
        : undefined;

    const computedCoverage =
      normalizePct(coveragePct) ??
      (typeof indexStatus?.coverage === "number"
        ? indexStatus.coverage
        : typeof rawIndexedCount === "number" &&
            typeof totalForDisplay === "number" &&
            totalForDisplay > 0
          ? normalizePct(rawIndexedCount / totalForDisplay)
          : undefined);

    const coverageText =
      computedCoverage !== undefined
        ? `${Math.round(computedCoverage * 100)}%`
        : undefined;

    const effectiveEtaSeconds =
      indexStatus?.etaSeconds && Number.isFinite(indexStatus.etaSeconds)
        ? indexStatus.etaSeconds
        : typeof etaSeconds === "number" && etaSeconds > 0
          ? etaSeconds
          : undefined;

    const etaInline = formatEta(effectiveEtaSeconds);

    const ratePerSecond =
      indexStatus?.ratePerSecond && Number.isFinite(indexStatus.ratePerSecond)
        ? indexStatus.ratePerSecond
        : undefined;

    const rpm = ratePerMinuteStr(ratePerSecond);
    const rateInline = rpm ? `Rate ${rpm} items/min` : undefined;

    const lastIndexedText = indexStatus?.lastIndexedAt
      ? new Date(indexStatus.lastIndexedAt).toLocaleString()
      : undefined;

    const tooltipLines = (() => {
      const lines: string[] = [];

      if (indexStatus?.processed && indexStatus.processed.total > 0) {
        const processedPctRaw = Math.round(
          (indexStatus.processed.done / indexStatus.processed.total) * 100,
        );
        const baseProcessed = `Processed: ${numberFormatter.format(
          indexStatus.processed.done,
        )}/${numberFormatter.format(indexStatus.processed.total)}`;

        lines.push(
          Number.isFinite(processedPctRaw)
            ? `${baseProcessed} (${Math.max(0, Math.min(100, processedPctRaw))}%)`
            : baseProcessed,
        );
      }

      const targetForHover =
        indexStatus?.target !== undefined ? indexStatus.target : totalForDisplay;
      const indexedForHover =
        indexStatus?.indexed !== undefined ? indexStatus.indexed : rawIndexedCount;

      if (
        typeof indexedForHover === "number" &&
        typeof targetForHover === "number"
      ) {
        const coverageLabel = coverageText ? ` (${coverageText})` : "";
        lines.push(
          `Indexed: ${numberFormatter.format(
            indexedForHover,
          )}/${numberFormatter.format(targetForHover)}${coverageLabel}`,
        );
      }

      if (typeof indexStatus?.drift === "number" && indexStatus.drift !== 0) {
        const driftAbs = Math.abs(indexStatus.drift);
        const driftLabel = indexStatus.drift > 0 ? "Remaining" : "Over";
        lines.push(`${driftLabel}: ${numberFormatter.format(driftAbs)}`);
      }

      if (effectiveEtaSeconds) {
        lines.push(`ETA: ${humanizeSeconds(Math.round(effectiveEtaSeconds))}`);
      }

      if (ratePerSecond && ratePerSecond > 0) {
        const rateText = ratePerMinuteStr(ratePerSecond);
        if (rateText) lines.push(`Rate: ${rateText} items/min`);
      }

      if (lastIndexedText) {
        lines.push(`Last index: ${lastIndexedText}`);
      }

      if (lines.length > 0) return lines;
      if (!tooltip) return [];
      return tooltip.split(" • ");
    })();

    const showIndexChip =
      typeof rawIndexedCount === "number" && !Number.isNaN(rawIndexedCount);

    return {
      rawIndexedCount,
      formattedIndexedCount,
      formattedTotal,
      coverageText,
      etaInline,
      rateInline,
      lastIndexedText,
      tooltipLines,
      showIndexChip,
    };
  }, [
    coveragePct,
    diag,
    etaSeconds,
    indexStatus,
    indexedCount,
    indexedTotal,
    tooltip,
  ]);
}
