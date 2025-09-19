/**
 * React Profiler wrapper for performance monitoring
 */
import {
	memo,
	Profiler,
	type ProfilerOnRenderCallback,
	type ReactNode,
} from "react";

interface PerformanceProfilerProps {
	id: string;
	children: ReactNode;
	onRender?: ProfilerOnRenderCallback;
}

const PerformanceProfiler = memo(
	({ id, children, onRender }: PerformanceProfilerProps) => {
		const defaultOnRender: ProfilerOnRenderCallback = (
			profilerId,
			phase,
			actualDuration,
			baseDuration,
			startTime,
			commitTime,
		) => {
			// Log performance data for development
			if (process.env.NODE_ENV === "development") {
				console.log(`[PerformanceProfiler] ${profilerId}:`, {
					phase,
					actualDuration: `${actualDuration.toFixed(2)}ms`,
					baseDuration: `${baseDuration.toFixed(2)}ms`,
					startTime,
					commitTime,
				});

				// Alert on slow renders (>16ms for 60fps)
				if (actualDuration > 16) {
					console.warn(
						`⚠️ Slow render detected in ${profilerId}: ${actualDuration.toFixed(
							2,
						)}ms`,
					);
				}
			}
		};

		return (
			<Profiler id={id} onRender={onRender || defaultOnRender}>
				{children}
			</Profiler>
		);
	},
);

PerformanceProfiler.displayName = "PerformanceProfiler";

export default PerformanceProfiler;
