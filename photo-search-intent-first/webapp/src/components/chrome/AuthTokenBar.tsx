export interface AuthTokenBarProps {
	authRequired: boolean;
	authTokenInput: string;
	onAuthTokenInputChange: (value: string) => void;
	onSaveToken: () => Promise<void>;
}

export function AuthTokenBar({
	authRequired,
	authTokenInput,
	onAuthTokenInputChange,
	onSaveToken,
}: AuthTokenBarProps) {
	if (!authRequired) return null;

	return (
		<div className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 flex items-center gap-2 border-b border-amber-200 dark:border-amber-800">
			<span className="text-sm">API requires token</span>
			<input
				type="password"
				className="px-2 py-1 text-sm rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900"
				placeholder="Enter token"
				value={authTokenInput}
				onChange={(event) => onAuthTokenInputChange(event.target.value)}
			/>
			<button
				type="button"
				className="text-sm px-2 py-1 bg-amber-600 text-white rounded"
				onClick={onSaveToken}
			>
				Save
			</button>
		</div>
	);
}
