import type React from "react";
import { useContext } from "react";
import { useActionsContext } from "../contexts/ActionsContext";
import { useDataContext } from "../contexts/DataContext";
import {
	type ModalActions,
	type ModalData,
	ModalDataProvider,
} from "../contexts/ModalDataContext";
import { useSettingsContext } from "../contexts/SettingsContext";
import ViewStateContext from "../contexts/ViewStateContext";

/**
 * ModalDataBridgeProvider
 *
 * Intent:
 *  - Reconstruct the legacy ModalDataContext contract from the new distributed
 *    context/hooks architecture so existing modal components (ModalManager descendants)
 *    can operate without tightly coupling to multiple sources.
 *  - Provides a backward-compatibility layer while we progressively refactor
 *    individual modals to consume narrower, purpose‑built hooks.
 *
 * Strategy:
 *  - Compose minimal, safe defaults for every ModalData field.
 *  - Pull real values where they already exist (directory, selection, tags, metadata).
 *  - Supply no‑op / passthrough actions that log a warning so we can detect unintended usage.
 *  - Keep implementation intentionally lean; future enhancement should replace any no‑op with real orchestration.
 */

// Utility no-op logger (namespaced for easy grep during hardening sprint)
const noop = (label: string) => () =>
	// eslint-disable-next-line no-console -- intentional diagnostic surface
	console.warn(`[ModalDataBridgeProvider] noop action invoked: ${label}`);

export const ModalDataBridgeProvider: React.FC<{
	children: React.ReactNode;
}> = ({ children }) => {
	// Directory & engine related data
	const { state: settingsState, actions: settingsActions } =
		useSettingsContext();
	// Safe (optional) view state access – bridge should not hard crash if provider not yet mounted
	const viewState = useContext(ViewStateContext);
	const dataState = useDataContext();
	const globalActions = useActionsContext();

	// Derive fields with graceful fallbacks
	const selected = viewState?.selected ?? new Set<string>();

	const modalData: ModalData = {
		selected,
		dir: dataState.dir || "",
		engine: settingsState.engine,
		topK: settingsState.topK,
		highContrast: dataState.highContrast,
		useFast: settingsState.useFast,
		fastKind: (settingsState.fastKind as ModalData["fastKind"]) || "",
		useCaps: settingsState.useCaptions,
		useOcr: settingsState.useOcr,
		hasText: dataState.hasText,
		useOsTrash: false,
		searchText: viewState?.searchText || "",
		query: dataState.query,
		collections: (dataState.collections as Record<string, string[]>) || {},
		clusters: dataState.clusters || [],
		allTags: dataState.allTags || [],
		meta: dataState.meta || null,
	};

	const modalActions: ModalActions = {
		settingsActions: {
			setDir: noop("setDir"),
			setUseOsTrash: noop("setUseOsTrash"),
			setUseFast: settingsActions.setUseFast,
			setFastKind: (k) => settingsActions.setFastKind(k),
			setUseCaps: settingsActions.setUseCaptions,
			setUseOcr: settingsActions.setUseOcr,
			setHasText: noop("setHasText"),
			setHighContrast: noop("setHighContrast"),
		},
		uiActions: {
			setBusy: noop("setBusy"),
			setNote: noop("setNote"),
		},
		photoActions: {
			setResults: noop("setResults"),
			setSaved: noop("setSaved"),
			setCollections: noop("setCollections"),
		},
		libIndex: async () => noop("libIndex")(),
		prepareFast: (kind) => globalActions.prepareFast(kind),
		buildOCR: async () => globalActions.buildOCR(),
		buildMetadata: async () => globalActions.buildMetadata(),
		tagSelected: (tag) => globalActions.tagSelected(tag),
	};

	return (
		<ModalDataProvider data={modalData} actions={modalActions}>
			{children}
		</ModalDataProvider>
	);
};

export default ModalDataBridgeProvider;
