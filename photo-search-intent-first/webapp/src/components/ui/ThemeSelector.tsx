import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";

interface Theme {
	name: string;
	colors: string;
	accent: string;
}

interface ThemeSelectorProps {
	isOpen: boolean;
	collectionName: string | null;
	currentTheme: string;
	themes: Record<string, Theme>;
	onClose: () => void;
	onSelectTheme: (collectionName: string, themeKey: string) => void;
}

export function ThemeSelector({
	isOpen,
	collectionName,
	currentTheme,
	themes,
	onClose,
	onSelectTheme,
}: ThemeSelectorProps) {
	if (!collectionName) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md w-full p-6">
				<DialogHeader>
					<DialogTitle>Choose Theme</DialogTitle>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-3">
					{Object.entries(themes).map(([key, theme]) => (
						<button
							key={key}
							type="button"
							onClick={() => {
								onSelectTheme(collectionName, key);
								onClose();
							}}
							className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
								currentTheme === key
									? "border-blue-500 ring-2 ring-blue-200"
									: "border-gray-200 hover:border-gray-300"
							}`}
						>
							<div className={`w-full h-12 rounded-lg bg-gradient-to-br ${theme.colors} mb-2`} />
							<div className={`text-sm font-medium ${theme.accent}`}>
								{theme.name}
							</div>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}