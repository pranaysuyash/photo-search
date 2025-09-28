import { useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/shadcn/Select";

interface VideoFilter {
	label: string;
	expr: string;
}

interface VideoFilterDropdownProps {
	value: string | null;
	onValueChange: (filter: VideoFilter | null) => void;
	currentQuery: string;
	setQuery: (query: string) => void;
	placeholder?: string;
	className?: string;
}

const videoFilters: VideoFilter[] = [
	{
		label: "Video > 30s",
		expr: "(filetype:mp4 OR filetype:mov OR filetype:webm OR filetype:mkv OR filetype:avi) AND duration:>30",
	},
	{
		label: "Slow-mo",
		expr: '(filetype:mp4 OR filetype:mov OR filetype:webm OR filetype:mkv OR filetype:avi) AND (tag:slowmo OR tag:slomo OR tag:"slow motion")',
	},
	{
		label: "Timelapse",
		expr: '(filetype:mp4 OR filetype:mov OR filetype:webm OR filetype:mkv OR filetype:avi) AND (tag:timelapse OR tag:"time lapse" OR tag:"time-lapse")',
	},
];

export function VideoFilterDropdown({
	value,
	onValueChange,
	currentQuery,
	setQuery,
	placeholder = "Video filters...",
	className,
}: VideoFilterDropdownProps) {
	const [open, setOpen] = useState(false);

	const _handleSelect = (filterLabel: string) => {
		const filter = videoFilters.find((f) => f.label === filterLabel);
		if (filter) {
			const next = currentQuery.trim();
			const qq = next ? `${next} ${filter.expr}` : filter.expr;
			setQuery(qq);
			onValueChange(filter);
		}
		setOpen(false);
	};

	const handleClear = () => {
		onValueChange(null);
		setOpen(false);
	};

	return (
		<Select open={open} onOpenChange={setOpen} value={value || ""}>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="" onClick={handleClear}>
					<span className="text-gray-500">Clear filter</span>
				</SelectItem>
				{videoFilters.map((filter) => (
					<SelectItem key={filter.label} value={filter.label}>
						{filter.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
