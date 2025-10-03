import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchContext } from "../contexts/SearchContext";
import { cn } from "../lib/utils";
import { FocusTrap } from "../utils/accessibility";
import { SearchBar } from "./SearchBar";
import { Button, buttonVariants } from "./ui/shadcn";
import { VideoFilterDropdown } from "./VideoFilterDropdown";

interface SearchOverlayProps {
	open: boolean;
	onClose: () => void;
	// Optional: falls back to SearchContext if omitted
	searchText?: string;
	setSearchText?: (t: string) => void;
	onSearch?: (t: string) => void;
	clusters?: Array<{ name?: string }>;
	allTags?: string[];
	meta?: {
		cameras?: string[];
		places?: (string | number)[];
	};
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
	open,
	onClose,
	searchText,
	setSearchText,
	onSearch,
	clusters = [],
	allTags = [],
	meta = {},
}) => {
	const ctx = useSearchContext();
	const q = useMemo(
		() => searchText ?? ctx.state.query,
		[searchText, ctx.state.query],
	);
	const setQ = (t: string) =>
		setSearchText ? setSearchText(t) : ctx.actions.setQuery(t);
	const doSearch = async (t: string) => {
		if (onSearch) onSearch(t);
		else await ctx.actions.performSearch(t);
	};
	// Close on background click
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	// Announce quick keyboard hints the first time overlay opens in a session
	const [hintShown, setHintShown] = useState(false);
	useEffect(() => {
		if (!open) return;
		try {
			const k = "ps_search_overlay_hint";
			if (!localStorage.getItem(k)) {
				setHintShown(true);
				localStorage.setItem(k, "1");
			}
		} catch {
			// ignore
		}
	}, [open]);

	const [showFilters, setShowFilters] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [selectedVideoFilter, setSelectedVideoFilter] = useState<{
		label: string;
		expr: string;
	} | null>(null);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-3 md:p-6 bg-black/30 backdrop-blur-md supports-[backdrop-filter]:bg-black/25 supports-[backdrop-filter]:backdrop-blur-xl transition-all duration-300 ease-out"
			role="dialog"
			aria-modal="true"
			aria-label="Search Photos"
		>
			<FocusTrap onEscape={onClose}>
				{/* Live region for first-time keyboard hint */}
				{hintShown && (
					<div className="sr-only" aria-live="polite">
						Type to search. Use Arrow keys to navigate suggestions and Enter to
						apply.
					</div>
				)}
				<div className="w-full max-w-3xl rounded-2xl shadow-lg border border-border bg-card text-foreground backdrop-brightness-110 backdrop-contrast-105 transform transition-all duration-300 ease-out scale-95 opacity-0 animate-in fade-in-0 zoom-in-95">
					<div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-border">
						<div className="text-base md:text-lg font-semibold">
							Search Photos
						</div>
						<Button
							variant="pillOutline"
							size="pill"
							onClick={onClose}
							aria-label="Close search"
						>
							Close
						</Button>
					</div>

					<form
						className="px-4 md:px-6 py-4 md:py-6 space-y-4"
						onSubmit={async (e) => {
							e.preventDefault();
							await doSearch(q);
							onClose();
						}}
					>
						<SearchBar
							searchText={q}
							setSearchText={setQ}
							onSearch={async (qq) => {
								await doSearch(qq);
								onClose();
							}}
							clusters={clusters}
							allTags={allTags}
							meta={meta}
						/>

						{/* Applied tokens (removable) */}
						<AppliedTokens
							query={q}
							onRemove={(tok) => {
								const next = (q || "")
									.replace(tok, "")
									.replace(/\s{2,}/g, " ")
									.trim();
								setQ(next);
								doSearch(next);
							}}
							onClear={() => {
								const next = (q || "")
									.replace(/(?:[a-z_]+:"[^"]+"|[a-z_]+:[^\s)]+)/gi, "")
									.replace(/\s{2,}/g, " ")
									.trim();
								setQ(next);
								if (next !== (q || "").trim()) doSearch(next);
							}}
						/>
					</form>

					{/* Quick scopes – minimal, more in Filters Drawer in later phases */}
					<div className="mt-3 flex flex-wrap gap-2">
						{["All", "Today", "This Week", "This Month"].map((label) => (
							<button
								key={label}
								type="button"
								className={cn(
									buttonVariants({ variant: "pillOutline", size: "pill" }),
									"justify-start",
								)}
								onClick={() => {
									const now = new Date();
									const startOfDay = new Date(
										now.getFullYear(),
										now.getMonth(),
										now.getDate(),
									);
									const startOfWeek = new Date(startOfDay);
									// Make Monday the start of week
									const day = startOfWeek.getDay();
									const diffToMonday = (day === 0 ? -6 : 1) - day; // 0(Sun)->-6, 1(Mon)->0, ...
									startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
									const startOfMonth = new Date(
										now.getFullYear(),
										now.getMonth(),
										1,
									);

									// Compute token
									let tok = "";
									if (label === "Today")
										tok = `mtime:>=${Math.floor(startOfDay.getTime() / 1000)}`;
									else if (label === "This Week")
										tok = `mtime:>=${Math.floor(startOfWeek.getTime() / 1000)}`;
									else if (label === "This Month")
										tok = `mtime:>=${Math.floor(
											startOfMonth.getTime() / 1000,
										)}`;

									// Remove existing mtime tokens to avoid duplication
									const base = (q || "")
										.replace(/\bmtime:[^\s)]+/gi, "")
										.replace(/\s{2,}/g, " ")
										.trim();
									const next =
										label === "All" ? base : base ? `${base} ${tok}` : tok;
									setQ(next);
									doSearch(next);
									onClose();
								}}
							>
								{label}
							</button>
						))}
					</div>

					{/* Controls row */}
					<div className="mt-4 flex items-center gap-2">
						<button
							type="button"
							className={buttonVariants({
								variant: "pillOutline",
								size: "pill",
							})}
							onClick={() => setShowFilters((v) => !v)}
							aria-expanded={showFilters ? "true" : "false"}
							aria-controls="overlay-filters"
						>
							Filters
						</button>
						<button
							type="button"
							className={buttonVariants({
								variant: "pillOutline",
								size: "pill",
							})}
							onClick={() => setShowAdvanced((v) => !v)}
							aria-expanded={showAdvanced ? "true" : "false"}
							aria-controls="overlay-advanced"
						>
							Advanced
						</button>
						<div className="ml-auto text-xs text-gray-500">
							Tip: press / to open search
						</div>
					</div>

					{/* Filters Drawer */}
					{showFilters && (
						<div id="overlay-filters" className="mt-3 flex flex-wrap gap-2">
							{[
								{ label: "Text in Image", expr: "has_text:true" },
								{ label: "High ISO", expr: "iso:>=1600" },
								{ label: "Shallow DoF", expr: "fnumber:<2.8" },
								{ label: "Large", expr: "width:>=3000 height:>=2000" },
								{ label: "Underexposed", expr: "brightness:<50" },
								{ label: "Sharp Only", expr: "sharpness:>=60" },
							].map((p) => (
								<button
									key={p.label}
									type="button"
									className={cn(
										buttonVariants({ variant: "pillOutline", size: "pill" }),
										"justify-start",
									)}
									title={p.expr}
									onClick={() => {
										const tok = p.expr;
										const next = (searchText || "").trim();
										const q = next ? `${next} ${tok}` : tok;
										if (setSearchText) setSearchText(q);
										if (onSearch) onSearch(q);
										onClose();
									}}
								>
									{p.label}
								</button>
							))}

							{/* Video filters dropdown */}
							<VideoFilterDropdown
								value={selectedVideoFilter?.label || null}
								onValueChange={(filter) => {
									setSelectedVideoFilter(filter);
									if (filter) {
										const next = (searchText || "").trim();
										const q = next ? `${next} ${filter.expr}` : filter.expr;
										if (setSearchText) setSearchText(q);
										if (onSearch) onSearch(q);
										onClose();
									}
								}}
								currentQuery={searchText || ""}
								setQuery={(newQuery) => {
									if (setSearchText) setSearchText(newQuery);
									if (onSearch) onSearch(newQuery);
									onClose();
								}}
								placeholder="Video filters..."
								className="w-40"
							/>
						</div>
					)}

					{/* Advanced help/DSL */}
					{showAdvanced && (
						<div
							id="overlay-advanced"
							className="mt-4 p-3 rounded-md border border-gray-200 dark:border-gray-800 text-[13px] text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40"
						>
							<div className="font-semibold mb-2">Boolean query syntax</div>
							<div>Use AND, OR, NOT and parentheses ( ).</div>
							<div className="mt-1">
								Fields: camera:, place:, tag:, rating:, person:, has_text:,
								filetype:
							</div>
							<div className="mt-1">
								Numeric: iso:, fnumber:, width:, height:, mtime:, brightness:,
								sharpness:, exposure:, focal:, duration: (supports &gt;=, &lt;=,
								&gt;, &lt;, =)
							</div>
							<div className="mt-2">Examples:</div>
							<ul className="list-disc ml-5 mt-1">
								<li>birthday AND person:"Alex"</li>
								<li>camera:"iPhone" AND iso:&lt;=800</li>
								<li>(tag:sunset OR tag:golden) AND sharpness:&gt;=60</li>
							</ul>
							<div className="mt-3 text-xs text-gray-500">
								Tip: Start typing to see people, tags, and camera suggestions.
							</div>
						</div>
					)}
				</div>
			</FocusTrap>
		</div>
	);
};

// Lightweight token viewer with removal capability
function AppliedTokens({
	query,
	onRemove,
	onClear,
}: {
	query: string;
	onRemove: (token: string) => void;
	onClear: () => void;
}) {
	const tokens =
		(query || "").match(/(?:[a-z_]+:"[^"]+"|[a-z_]+:[^\s)]+)/gi) || [];
	if (tokens.length === 0) return null;
	return (
		<div className="mt-2 flex flex-wrap gap-2 items-center">
			{tokens.map((t) => (
				<button
					key={t}
					type="button"
					className={cn(
						buttonVariants({ variant: "pillOutline", size: "pill" }),
						"justify-start",
					)}
					title={`Remove ${t}`}
					onClick={() => onRemove(t)}
				>
					{t} ×
				</button>
			))}
			{tokens.length > 1 && (
				<button
					type="button"
					className="text-xs underline ml-1 text-gray-600"
					onClick={onClear}
				>
					Clear all
				</button>
			)}
		</div>
	);
}

export default SearchOverlay;
