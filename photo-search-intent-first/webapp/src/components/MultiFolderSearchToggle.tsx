import {
	ChevronDown,
	ChevronUp,
	FolderOpen,
	Layers,
	Search,
} from "lucide-react";
import { useState } from "react";
import EnhancedMultiFolderSearch from "./EnhancedMultiFolderSearch";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";

interface MultiFolderSearchToggleProps {
	workspace: string[];
	onSearch: (query: string, scope: any) => void;
	currentQuery?: string;
	className?: string;
}

export default function MultiFolderSearchToggle({
	workspace,
	onSearch,
	currentQuery = "",
	className,
}: MultiFolderSearchToggleProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Toggle Button */}
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger asChild>
					<Button
						variant="outline"
						className="w-full justify-between h-12 px-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:border-blue-400 hover:from-blue-100 hover:to-purple-100 transition-all"
					>
						<div className="flex items-center gap-3">
							<div className="p-1 bg-blue-600 rounded">
								<Layers className="w-4 h-4 text-white" />
							</div>
							<div className="text-left">
								<div className="font-medium text-blue-900">
									Multi-Folder Search
								</div>
								<div className="text-xs text-blue-700">
									Search across {workspace.length} folders simultaneously
								</div>
							</div>
						</div>
						{isOpen ? (
							<ChevronUp className="w-4 h-4 text-blue-600" />
						) : (
							<ChevronDown className="w-4 h-4 text-blue-600" />
						)}
					</Button>
				</CollapsibleTrigger>

				<CollapsibleContent className="space-y-4">
					<Card className="border-2 border-blue-200 shadow-lg">
						<CardHeader className="pb-4">
							<CardTitle className="flex items-center gap-2 text-lg">
								<FolderOpen className="w-5 h-5 text-blue-600" />
								Enhanced Multi-Folder Search
							</CardTitle>
						</CardHeader>
						<CardContent>
							<EnhancedMultiFolderSearch
								workspace={workspace}
								onSearch={(query, scope) => {
									onSearch(query, scope);
									setIsOpen(false); // Close after search
								}}
								currentQuery={currentQuery}
							/>
						</CardContent>
					</Card>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
