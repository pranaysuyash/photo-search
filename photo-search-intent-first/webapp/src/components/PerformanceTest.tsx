/**
 * Performance test component for benchmarking UI improvements
 */
import { useCallback, useState } from "react";

interface PerformanceMemory {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
}

interface WindowWithGC extends Window {
	gc?: () => void;
}

interface PerformanceTestProps {
	onTestComplete?: (results: PerformanceTestResults) => void;
}

export interface PerformanceTestResults {
	renderTime: number;
	memoryDelta: number;
	testName: string;
	timestamp: number;
}

const PerformanceTest: React.FC<PerformanceTestProps> = ({
	onTestComplete,
}) => {
	const [isRunning, setIsRunning] = useState(false);
	const [results, setResults] = useState<PerformanceTestResults[]>([]);

	const getMemoryUsage = useCallback((): number => {
		const memory = (performance as { memory?: PerformanceMemory }).memory;
		return memory?.usedJSHeapSize || 0;
	}, []);

	const runRenderTest = useCallback(async () => {
		setIsRunning(true);
		const startTime = performance.now();
		const startMemory = getMemoryUsage();

		// Simulate heavy rendering workload
		await new Promise((resolve) => {
			// Force multiple re-renders
			let count = 0;
			const interval = setInterval(() => {
				count++;
				if (count >= 10) {
					clearInterval(interval);
					resolve(void 0);
				}
				// Trigger re-render by updating state
				setResults((prev) => [...prev]);
			}, 100);
		});

		const endTime = performance.now();
		const endMemory = getMemoryUsage();

		const testResult: PerformanceTestResults = {
			renderTime: endTime - startTime,
			memoryDelta: endMemory - startMemory,
			testName: "Render Performance Test",
			timestamp: Date.now(),
		};

		setResults((prev) => [...prev, testResult]);
		setIsRunning(false);

		if (onTestComplete) {
			onTestComplete(testResult);
		}
	}, [onTestComplete, getMemoryUsage]);

	const runMemoryTest = useCallback(async () => {
		setIsRunning(true);
		const startMemory = getMemoryUsage();

		// Create memory pressure
		const arrays: number[][] = [];
		for (let i = 0; i < 100; i++) {
			arrays.push(new Array(10000).fill(Math.random()));
		}

		// Force garbage collection hint
		const gc = (window as WindowWithGC).gc;
		if (gc) {
			gc();
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));

		const endMemory = getMemoryUsage();

		// Clean up
		arrays.length = 0;

		const testResult: PerformanceTestResults = {
			renderTime: 0,
			memoryDelta: endMemory - startMemory,
			testName: "Memory Leak Test",
			timestamp: Date.now(),
		};

		setResults((prev) => [...prev, testResult]);
		setIsRunning(false);

		if (onTestComplete) {
			onTestComplete(testResult);
		}
	}, [onTestComplete, getMemoryUsage]);

	const clearResults = useCallback(() => {
		setResults([]);
	}, []);

	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	return (
		<div className="fixed bottom-20 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono z-[9998] max-w-xs">
			<div className="flex items-center justify-between mb-2">
				<h4 className="font-bold">Performance Tests</h4>
				<button
					type="button"
					onClick={clearResults}
					className="text-gray-400 hover:text-white text-sm"
				>
					✕
				</button>
			</div>

			<div className="space-y-2">
				<button
					type="button"
					onClick={runRenderTest}
					disabled={isRunning}
					className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
				>
					{isRunning ? "Running..." : "Test Render Perf"}
				</button>

				<button
					type="button"
					onClick={runMemoryTest}
					disabled={isRunning}
					className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
				>
					{isRunning ? "Running..." : "Test Memory"}
				</button>

				{results.length > 0 && (
					<div className="border-t border-gray-600 pt-2 mt-2">
						<div className="text-xs text-gray-400 mb-1">Recent Results:</div>
						{results.slice(-3).map((result) => (
							<div key={result.timestamp} className="text-xs mb-1">
								<div className="truncate">{result.testName}</div>
								<div className="flex justify-between">
									<span>Time: {result.renderTime.toFixed(1)}ms</span>
									<span>
										Mem: {(result.memoryDelta / 1024 / 1024).toFixed(1)}MB
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default PerformanceTest;
