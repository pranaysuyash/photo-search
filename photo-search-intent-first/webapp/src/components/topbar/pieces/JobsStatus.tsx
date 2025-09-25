import type React from "react";

export const JobsStatus: React.FC<{
	activeJobs?: number;
	onOpenJobs?: () => void;
}> = ({ activeJobs, onOpenJobs }) => {
	if (typeof activeJobs !== "number" || activeJobs <= 0) return null;

	return (
		<button
			type="button"
			className="chip"
			onClick={() => onOpenJobs?.()}
			title="View running tasks"
			aria-label={`Open Jobs (${activeJobs})`}
		>
			Jobs ({activeJobs})
		</button>
	);
};
