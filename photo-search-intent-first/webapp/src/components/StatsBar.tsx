export interface StatsBarProps {
	items: any[];
	note: string;
	diag: {
		engines?: Array<{
			key: string;
			count?: number;
			fast?: {
				annoy?: boolean;
				faiss?: boolean;
				hnsw?: boolean;
			};
		}>;
	} | null;
	engine: string;
}

export function StatsBar({ items, note, diag, engine }: StatsBarProps) {
	const total = items.length;
	const engineInfo = (diag?.engines || []).find((e) => e.key === engine);
	const fastReady =
		engineInfo?.fast &&
		(engineInfo.fast.annoy || engineInfo.fast.faiss || engineInfo.fast.hnsw);

	return (
		<div className="stats-bar">
			<div className="stats-content">
				<div className="stats-left">
					<span>{total} photos</span>
					{note ? <span className="text-gray-800">{note}</span> : null}
				</div>
				<div className="stats-right">
					<div className="status-indicator">
						<div
							className={`status-dot ${engineInfo?.count ? "ready" : "empty"}`}
						></div>
						<span>AI Index {engineInfo?.count ? "Ready" : "Empty"}</span>
					</div>
					<div className="status-indicator">
						<div
							className={`status-dot ${fastReady ? "fast-ready" : "empty"}`}
						></div>
						<span>Fast Index {fastReady ? "Ready" : "—"}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
