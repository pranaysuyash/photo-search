import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

interface SearchTipsHintProps {
	visible: boolean;
	onDismiss: () => void;
	anchorSelector?: string; // CSS selector to attempt positioning near search bar
}

function useAnchorPosition(selector: string | undefined, visible: boolean) {
	const ref = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (!selector || !visible) return;
		const el = document.querySelector(selector) as HTMLElement | null;
		const node = ref.current;
		if (el && node) {
			const rect = el.getBoundingClientRect();
			node.style.position = "fixed";
			node.style.top = `${rect.bottom + 8}px`;
			node.style.left = `${rect.left}px`;
			node.style.maxWidth = "360px";
			node.style.zIndex = "70"; // above onboarding highlight (z-60) but below modals
		}
	}, [selector, visible]);
	return ref;
}

export function SearchTipsHint({
	visible,
	onDismiss,
	anchorSelector = 'input[type="search"], input[data-search="primary"]',
}: SearchTipsHintProps) {
	const anchorRef = useAnchorPosition(anchorSelector, visible);
	if (!visible) return null;
	return (
		<div
			ref={anchorRef}
			role="dialog"
			aria-live="polite"
			aria-label="Search tips"
			className={clsx(
				"rounded-md shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm leading-snug",
				"animate-fade-in",
			)}
		>
			<div className="font-medium mb-1 text-gray-800 dark:text-gray-100">
				Pro tip: refine your search
			</div>
			<ul className="list-disc ml-4 space-y-0.5 text-gray-600 dark:text-gray-300">
				<li>
					<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
						AND
					</kbd>{" "}
					/{" "}
					<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
						OR
					</kbd>{" "}
					to combine ideas
				</li>
				<li>
					Quotes for exact phrases:{" "}
					<span className="italic">"golden retriever"</span>
				</li>
				<li>
					Filter fields: <code>camera:sony tag:beach</code>
				</li>
			</ul>
			<div className="mt-2 flex gap-2 justify-end">
				<button
					type="button"
					onClick={onDismiss}
					className="text-xs font-medium px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
				>
					Got it
				</button>
			</div>
		</div>
	);
}

interface SearchTipsManagerProps {
	libraryCount: number;
	onboardingActive: boolean;
}

export function SearchTipsManager({
	libraryCount,
	onboardingActive,
}: SearchTipsManagerProps) {
	const [show, setShow] = useState(false);
	const dismiss = useCallback(() => {
		setShow(false);
		try {
			localStorage.setItem("hint-search-tips-shown", "1");
		} catch {}
	}, []);

	useEffect(() => {
		function handleFirstInteraction() {
			if (onboardingActive) return;
			if (libraryCount === 0) return; // wait until photos present
			try {
				if (localStorage.getItem("hint-search-tips-shown")) return;
			} catch {}
			setShow(true);
		}
		function handleSearchExecuted() {
			if (show) dismiss();
		}
		window.addEventListener("search-first-interaction", handleFirstInteraction);
		window.addEventListener("search-executed", handleSearchExecuted);
		return () => {
			window.removeEventListener(
				"search-first-interaction",
				handleFirstInteraction,
			);
			window.removeEventListener("search-executed", handleSearchExecuted);
		};
	}, [libraryCount, onboardingActive, show, dismiss]);

	return <SearchTipsHint visible={show} onDismiss={dismiss} />;
}
