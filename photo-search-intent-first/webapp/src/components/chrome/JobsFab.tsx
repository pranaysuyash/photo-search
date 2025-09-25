export interface JobsFabProps {
	onOpenJobs: () => void;
}

export function JobsFab({ onOpenJobs }: JobsFabProps) {
	return (
		<button
			type="button"
			onClick={onOpenJobs}
			className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full shadow px-4 py-2"
			title="Open Jobs"
			aria-label="Open the jobs panel"
			aria-haspopup="dialog"
		>
			Jobs
		</button>
	);
}
