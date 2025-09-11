import {
	Camera,
	Download,
	Hand,
	Smartphone,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";

export function MobilePWATest() {
	const [isOnline, setIsOnline] = useState(navigator.onLine);
	const [cameraSupported, setCameraSupported] = useState(false);
	const [pwaInstalled, setPwaInstalled] = useState(false);
	const [touchSupported, setTouchSupported] = useState(false);
	const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

	useEffect(() => {
		// Check online status
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		// Check camera support
		const hasCamera = !!navigator.mediaDevices?.getUserMedia;
		setCameraSupported(hasCamera);

		// Check touch support
		setTouchSupported("ontouchstart" in window);

		// Check service worker
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.ready.then(() => {
				setServiceWorkerReady(true);
			});
		}

		// Check PWA installation
		if (window.matchMedia("(display-mode: standalone)").matches) {
			setPwaInstalled(true);
		}

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const features = [
		{
			name: "Touch Gestures",
			icon: Hand,
			status: touchSupported,
			description: "Pinch-to-zoom, swipe navigation",
		},
		{
			name: "Camera Access",
			icon: Camera,
			status: cameraSupported,
			description: "Native photo capture",
		},
		{
			name: "Offline Support",
			icon: isOnline ? Wifi : WifiOff,
			status: serviceWorkerReady,
			description: "Works without internet",
		},
		{
			name: "PWA Installation",
			icon: Smartphone,
			status: pwaInstalled,
			description: "Install as app",
		},
	];

	const testCache = async () => {
		try {
			if ("caches" in window) {
				const cache = await caches.open("test-cache");
				await cache.put("/test", new Response("Hello from cache!"));
				const response = await cache.match("/test");
				const text = await response?.text();
				alert(`Cache test: ${text || "Failed"}`);
			} else {
				alert("Cache API not supported");
			}
		} catch (error) {
			alert(`Cache test failed: ${error}`);
		}
	};

	const testCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false,
			});
			alert("Camera access successful!");
			stream.getTracks().forEach((track) => track.stop());
		} catch (error) {
			alert(`Camera test failed: ${error}`);
		}
	};

	const testTouchGestures = () => {
		alert(
			"Touch the screen to test gestures! Try pinching, swiping, or long-pressing.",
		);
	};

	return (
		<div className="p-4 max-w-4xl mx-auto">
			<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
				<h1 className="text-2xl font-bold text-gray-900 mb-4">
					Mobile PWA Features Test
				</h1>
				<p className="text-gray-600 mb-6">
					Test the mobile PWA features that were just implemented. This page
					helps verify that all the mobile enhancements are working correctly.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
					{features.map((feature, index) => {
						const Icon = feature.icon;
						return (
							<div
								key={`${feature.id || feature.path || feature.name || feature.key || ""}-${index}`}
								className="border rounded-lg p-4"
							>
								<div className="flex items-center mb-2">
									<Icon
										className={`w-6 h-6 mr-2 ${
											feature.status ? "text-green-500" : "text-gray-400"
										}`}
									/>
									<h3 className="font-semibold">{feature.name}</h3>
									<span
										className={`ml-auto px-2 py-1 text-xs rounded ${
											feature.status
												? "bg-green-100 text-green-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{feature.status ? "Available" : "Not Available"}
									</span>
								</div>
								<p className="text-sm text-gray-600">{feature.description}</p>
							</div>
						);
					})}
				</div>

				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Interactive Tests</h2>

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={testCache}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							disabled={!serviceWorkerReady}
						>
							<Download className="w-4 h-4 inline mr-2" />
							Test Cache API
						</button>

						<button
							type="button"
							onClick={testCamera}
							className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
							disabled={!cameraSupported}
						>
							<Camera className="w-4 h-4 inline mr-2" />
							Test Camera Access
						</button>

						<button
							type="button"
							onClick={testTouchGestures}
							className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
							disabled={!touchSupported}
						>
							<Hand className="w-4 h-4 inline mr-2" />
							Test Touch Gestures
						</button>
					</div>
				</div>

				<div className="mt-6 p-4 bg-gray-50 rounded-lg">
					<h3 className="font-semibold mb-2">Current Status</h3>
					<div className="space-y-1 text-sm">
						<div>
							Online Status:{" "}
							<span className={isOnline ? "text-green-600" : "text-red-600"}>
								{isOnline ? "Online" : "Offline"}
							</span>
						</div>
						<div>
							Service Worker:{" "}
							<span
								className={
									serviceWorkerReady ? "text-green-600" : "text-red-600"
								}
							>
								{serviceWorkerReady ? "Ready" : "Not Ready"}
							</span>
						</div>
						<div>
							Display Mode:{" "}
							<span className="text-blue-600">
								{pwaInstalled ? "Standalone (Installed)" : "Browser"}
							</span>
						</div>
					</div>
				</div>

				<div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<h3 className="font-semibold text-yellow-800 mb-2">Instructions</h3>
					<ul className="text-sm text-yellow-700 space-y-1">
						<li>• Test this page on a mobile device for best results</li>
						<li>• Try installing the app to test PWA features</li>
						<li>• Go offline to test cached functionality</li>
						<li>• Use touch gestures on photos to test interactions</li>
					</ul>
				</div>
			</div>
		</div>
	);
}

export default MobilePWATest;
