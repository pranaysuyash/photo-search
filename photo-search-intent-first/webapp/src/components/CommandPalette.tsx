// Command Palette Component
// User Intent: "I want to quickly access any feature with my keyboard"
// Provides keyboard-driven access to all app features

import {
	ArrowRight,
	Command,
	Download,
	Edit,
	FolderOpen,
	Grid,
	Heart,
	HelpCircle,
	Keyboard,
	MapPin,
	Moon,
	Search,
	Settings,
	Shield,
	Trash2,
	Users,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface AppCommand {
	id: string;
	title: string;
	description?: string;
	icon?: React.ReactNode;
	shortcut?: string[];
	category:
		| "search"
		| "navigate"
		| "edit"
		| "view"
		| "file"
		| "help"
		| "settings";
	action: () => void;
	keywords?: string[];
	available?: boolean;
}

interface CommandPaletteProps {
	isOpen: boolean;
	onClose: () => void;
	commands: AppCommand[];
	recentCommands?: string[];
}

export function CommandPalette({
	isOpen,
	onClose,
	commands,
	recentCommands = [],
}: CommandPaletteProps) {
	const [search, setSearch] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Filter and sort commands based on search
	const filteredCommands = useMemo(() => {
		if (!search) {
			// Show recent commands first when no search
			const recent = commands.filter((cmd) => recentCommands.includes(cmd.id));
			const others = commands.filter((cmd) => !recentCommands.includes(cmd.id));
			return [...recent, ...others].filter((cmd) => cmd.available !== false);
		}

		const searchLower = search.toLowerCase();
		const searchWords = searchLower.split(/\s+/);

		return commands
			.filter((cmd) => {
				if (cmd.available === false) return false;

				const titleMatch = cmd.title.toLowerCase().includes(searchLower);
				const descMatch = cmd.description?.toLowerCase().includes(searchLower);
				const keywordMatch = cmd.keywords?.some((k) =>
					k.toLowerCase().includes(searchLower),
				);
				const categoryMatch = cmd.category.includes(searchLower);

				// Check if all search words appear somewhere
				const allWordsMatch = searchWords.every(
					(word) =>
						cmd.title.toLowerCase().includes(word) ||
						cmd.description?.toLowerCase().includes(word) ||
						cmd.keywords?.some((k) => k.toLowerCase().includes(word)),
				);

				return (
					titleMatch ||
					descMatch ||
					keywordMatch ||
					categoryMatch ||
					allWordsMatch
				);
			})
			.sort((a, b) => {
				// Prioritize exact matches
				const aExact = a.title.toLowerCase() === searchLower;
				const bExact = b.title.toLowerCase() === searchLower;
				if (aExact && !bExact) return -1;
				if (!aExact && bExact) return 1;

				// Then prioritize title matches
				const aTitle = a.title.toLowerCase().includes(searchLower);
				const bTitle = b.title.toLowerCase().includes(searchLower);
				if (aTitle && !bTitle) return -1;
				if (!aTitle && bTitle) return 1;

				return 0;
			});
	}, [search, commands, recentCommands]);

	// Reset selection when search changes
	useEffect(() => {
		setSelectedIndex(0);
	}, []);

	// Focus input when opened
	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 100);
		} else {
			setSearch("");
			setSelectedIndex(0);
		}
	}, [isOpen]);

	const executeCommand = (command: AppCommand) => {
		command.action();
		onClose();

		// Track command usage
		const stored = localStorage.getItem("recent-commands") || "[]";
		const recent = JSON.parse(stored) as string[];
		const updated = [
			command.id,
			...recent.filter((id) => id !== command.id),
		].slice(0, 5);
		localStorage.setItem("recent-commands", JSON.stringify(updated));
	};

	// Keyboard navigation
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev < filteredCommands.length - 1 ? prev + 1 : 0,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev > 0 ? prev - 1 : filteredCommands.length - 1,
					);
					break;
				case "Enter":
					e.preventDefault();
					if (filteredCommands[selectedIndex]) {
						executeCommand(filteredCommands[selectedIndex]);
					}
					break;
				case "Escape":
					e.preventDefault();
					onClose();
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, selectedIndex, filteredCommands, onClose, executeCommand]);

	// Scroll selected item into view
	useEffect(() => {
		if (listRef.current) {
			const selectedElement = listRef.current.children[
				selectedIndex
			] as HTMLElement;
			if (selectedElement) {
				selectedElement.scrollIntoView({ block: "nearest" });
			}
		}
	}, [selectedIndex]);

	const getCategoryIcon = (category: AppCommand["category"]) => {
		const icons = {
			search: <Search className="w-4 h-4" />,
			navigate: <ArrowRight className="w-4 h-4" />,
			edit: <Edit className="w-4 h-4" />,
			view: <Grid className="w-4 h-4" />,
			file: <FolderOpen className="w-4 h-4" />,
			help: <HelpCircle className="w-4 h-4" />,
			settings: <Settings className="w-4 h-4" />,
		};
		return icons[category];
	};

	const formatShortcut = (keys?: string[]) => {
		if (!keys || keys.length === 0) return null;

		return keys.map((key, idx) => (
			<React.Fragment
				key={`key-${idx}`}
			>
				{idx > 0 && <span className="mx-0.5">+</span>}
				<kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
					{key === "cmd" ? "⌘" : key === "ctrl" ? "Ctrl" : key}
				</kbd>
			</React.Fragment>
		));
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
				{/* Search Input */}
				<div className="p-4 border-b dark:border-gray-700">
					<div className="flex items-center gap-3">
						<Command className="w-5 h-5 text-gray-400" />
						<input
							ref={inputRef}
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="What do you want to do?"
							className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
						/>
						<kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
							ESC
						</kbd>
					</div>
				</div>

				{/* Commands List */}
				<div ref={listRef} className="max-h-96 overflow-y-auto">
					{filteredCommands.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							<Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
							<p>No commands found</p>
							<p className="text-sm mt-1">Try a different search</p>
						</div>
					) : (
						<div className="py-2">
							{filteredCommands.map((command, idx) => (
								<button
									type="button"
									key={command.id}
									onClick={() => executeCommand(command)}
									onMouseEnter={() => setSelectedIndex(idx)}
									className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
										idx === selectedIndex ? "bg-gray-50 dark:bg-gray-700" : ""
									}`}
								>
									<div className="flex-shrink-0 text-gray-400">
										{command.icon || getCategoryIcon(command.category)}
									</div>
									<div className="flex-1 text-left">
										<div className="font-medium text-gray-900 dark:text-white">
											{command.title}
										</div>
										{command.description && (
											<div className="text-sm text-gray-500 dark:text-gray-400">
												{command.description}
											</div>
										)}
									</div>
									{command.shortcut && (
										<div className="flex items-center gap-1">
											{formatShortcut(command.shortcut)}
										</div>
									)}
									{idx === selectedIndex && (
										<ArrowRight className="w-4 h-4 text-gray-400" />
									)}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-3 border-t dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
					<div className="flex items-center gap-4">
						<span className="flex items-center gap-1">
							<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
								↑↓
							</kbd>
							Navigate
						</span>
						<span className="flex items-center gap-1">
							<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
								Enter
							</kbd>
							Select
						</span>
						<span className="flex items-center gap-1">
							<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
								ESC
							</kbd>
							Close
						</span>
					</div>
					<span>{filteredCommands.length} commands</span>
				</div>
			</div>
		</div>
	);
}

// Default commands for the app
export const defaultCommands: AppCommand[] = [
	// Search commands
	{
		id: "search-photos",
		title: "Search photos",
		description: "Find photos by description",
		icon: <Search className="w-4 h-4" />,
		shortcut: ["cmd", "k"],
		category: "search",
		action: () =>
			document.querySelector<HTMLInputElement>(".search-input")?.focus(),
		keywords: ["find", "look", "query"],
	},
	{
		id: "search-people",
		title: "Search for people",
		description: "Find photos of specific people",
		icon: <Users className="w-4 h-4" />,
		shortcut: ["cmd", "p"],
		category: "search",
		action: () => console.log("Search people"),
		keywords: ["faces", "person", "who"],
	},
	{
		id: "search-location",
		title: "Search by location",
		description: "Find photos from specific places",
		icon: <MapPin className="w-4 h-4" />,
		shortcut: ["cmd", "l"],
		category: "search",
		action: () => console.log("Search location"),
		keywords: ["place", "where", "map"],
	},

	// Navigate commands
	{
		id: "go-home",
		title: "Go home",
		description: "Return to main view",
		icon: <Grid className="w-4 h-4" />,
		shortcut: ["g", "h"],
		category: "navigate",
		action: () => (window.location.href = "/"),
		keywords: ["main", "start", "beginning"],
	},
	{
		id: "go-favorites",
		title: "View favorites",
		description: "See your favorite photos",
		icon: <Heart className="w-4 h-4" />,
		shortcut: ["g", "f"],
		category: "navigate",
		action: () => console.log("Go to favorites"),
		keywords: ["liked", "starred", "loved"],
	},

	// Edit commands
	{
		id: "select-all",
		title: "Select all",
		description: "Select all visible photos",
		shortcut: ["cmd", "a"],
		category: "edit",
		action: () => console.log("Select all"),
		keywords: ["choose", "pick"],
	},
	{
		id: "delete-selected",
		title: "Delete selected",
		description: "Move selected photos to trash",
		icon: <Trash2 className="w-4 h-4" />,
		shortcut: ["cmd", "delete"],
		category: "edit",
		action: () => console.log("Delete selected"),
		keywords: ["remove", "trash"],
	},

	// View commands
	{
		id: "toggle-grid",
		title: "Toggle view",
		description: "Switch between grid and list view",
		icon: <Grid className="w-4 h-4" />,
		shortcut: ["v"],
		category: "view",
		action: () => console.log("Toggle view"),
		keywords: ["layout", "display"],
	},
	{
		id: "zoom-in",
		title: "Zoom in",
		description: "Make photos larger",
		icon: <ZoomIn className="w-4 h-4" />,
		shortcut: ["cmd", "+"],
		category: "view",
		action: () => console.log("Zoom in"),
		keywords: ["bigger", "larger", "increase"],
	},
	{
		id: "zoom-out",
		title: "Zoom out",
		description: "Make photos smaller",
		icon: <ZoomOut className="w-4 h-4" />,
		shortcut: ["cmd", "-"],
		category: "view",
		action: () => console.log("Zoom out"),
		keywords: ["smaller", "decrease"],
	},

	// File commands
	{
		id: "open-folder",
		title: "Open folder",
		description: "Select a photo folder",
		icon: <FolderOpen className="w-4 h-4" />,
		shortcut: ["cmd", "o"],
		category: "file",
		action: () => console.log("Open folder"),
		keywords: ["directory", "browse"],
	},
	{
		id: "backup-photos",
		title: "Backup photos",
		description: "Open backup settings",
		icon: <Shield className="w-4 h-4" />,
		shortcut: ["cmd", "b"],
		category: "file",
		action: () => console.log("Backup photos"),
		keywords: ["save", "protect", "safety"],
	},
	{
		id: "export-photos",
		title: "Export photos",
		description: "Export selected photos",
		icon: <Download className="w-4 h-4" />,
		shortcut: ["cmd", "e"],
		category: "file",
		action: () => console.log("Export photos"),
		keywords: ["download", "save"],
	},

	// Settings commands
	{
		id: "toggle-theme",
		title: "Toggle dark mode",
		description: "Switch between light and dark theme",
		icon: <Moon className="w-4 h-4" />,
		shortcut: ["cmd", "d"],
		category: "settings",
		action: () => document.body.classList.toggle("dark"),
		keywords: ["theme", "dark", "light", "mode"],
	},
	{
		id: "open-settings",
		title: "Open settings",
		description: "Configure app preferences",
		icon: <Settings className="w-4 h-4" />,
		shortcut: ["cmd", ","],
		category: "settings",
		action: () => console.log("Open settings"),
		keywords: ["preferences", "config", "options"],
	},

	// Help commands
	{
		id: "show-shortcuts",
		title: "Show keyboard shortcuts",
		description: "View all keyboard shortcuts",
		icon: <Keyboard className="w-4 h-4" />,
		shortcut: ["?"],
		category: "help",
		action: () => console.log("Show shortcuts"),
		keywords: ["keys", "hotkeys", "bindings"],
	},
	{
		id: "show-help",
		title: "Help",
		description: "Get help and documentation",
		icon: <HelpCircle className="w-4 h-4" />,
		shortcut: ["cmd", "?"],
		category: "help",
		action: () => console.log("Show help"),
		keywords: ["guide", "tutorial", "docs"],
	},
];
