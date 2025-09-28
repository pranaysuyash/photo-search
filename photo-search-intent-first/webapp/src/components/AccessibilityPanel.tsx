/**
 * AccessibilityPanel - Provides UI for accessibility settings and controls
 * This component allows users to customize accessibility features and
 * provides visual feedback for screen reader announcements.
 */
import type React from "react";
import { useEffect, useState } from "react";
import {
	useAccessibilityContext,
	useAnnouncer,
	useHighContrast,
	useKeyboardNavigation,
	useReducedMotion,
} from "../framework/AccessibilityFramework";
import { cn } from "../lib/utils";

// Accessibility settings interface
export interface AccessibilitySettings {
	highContrast: boolean;
	reducedMotion: boolean;
	largeText: boolean;
	dyslexiaFriendly: boolean;
	screenReaderMode: boolean;
	keyboardNavigation: boolean;
	announceActions: boolean;
	announceProgress: boolean;
	announceErrors: boolean;
	voiceSpeed: "slow" | "normal" | "fast";
	voicePitch: "low" | "normal" | "high";
	preferredVoice?: string;
}

// Accessibility panel props
interface AccessibilityPanelProps {
	isOpen: boolean;
	onClose: () => void;
	onSettingsChange?: (settings: AccessibilitySettings) => void;
}

const toggleRootBase =
	"relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent";
const toggleRootState = [
	"transition-colors duration-200 ease-in-out",
	"focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
];
const toggleThumbBase =
	"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0";
const toggleThumbTransition = "transition duration-200 ease-in-out";
const toggleRootClass = (active: boolean) =>
	cn(toggleRootBase, toggleRootState, active ? "bg-indigo-600" : "bg-gray-200");
const toggleThumbClass = (active: boolean) =>
	cn(
		toggleThumbBase,
		toggleThumbTransition,
		active ? "translate-x-5" : "translate-x-0",
	);
const selectFieldBase =
	"mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base";
const selectFieldState =
	"focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm";
const inputFieldBase =
	"block w-full min-w-0 flex-1 rounded-none rounded-l-md border-gray-300 px-3 py-2";
const inputFieldState =
	"focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";
const inputButtonBase =
	"relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900";
const inputButtonState = "ring-1 ring-inset ring-gray-300 hover:bg-gray-50";

// Accessibility panel component
export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
	isOpen,
	onClose,
	onSettingsChange,
}) => {
	const { settings, updateSettings } = useAccessibilityContext();
	const { announce, announceAction, announceProgress, announceError } =
		useAnnouncer();
	const { isHighContrast, toggleHighContrast } = useHighContrast();
	const { isReducedMotion, toggleReducedMotion } = useReducedMotion();
	const {
		isKeyboardNavigationEnabled,
		enableKeyboardNavigation,
		disableKeyboardNavigation,
	} = useKeyboardNavigation();
	const [testMessage, setTestMessage] = useState("");
	const [testProgress, setTestProgress] = useState(0);
	const [testError, setTestError] = useState("");

	// Handle settings change
	const handleSettingsChange = (
		newSettings: Partial<AccessibilitySettings>,
	) => {
		updateSettings(newSettings);
		if (onSettingsChange) {
			onSettingsChange({ ...settings, ...newSettings });
		}
		announce("Accessibility settings updated", "polite");
	};

	// Test announcements
	const testAnnouncement = () => {
		if (testMessage.trim()) {
			announce(testMessage, "polite");
			setTestMessage("");
		}
	};

	const testActionAnnouncement = () => {
		announceAction("Test action", "started");
		setTimeout(() => {
			announceAction("Test action", "completed");
		}, 2000);
	};

	const testProgressAnnouncement = () => {
		if (testProgress > 0) {
			announceProgress(testProgress, 100, "Test progress");
			setTestProgress(0);
		}
	};

	const testErrorAnnouncement = () => {
		if (testError.trim()) {
			announceError(testError, "Test error");
			setTestError("");
		}
	};

	// Close panel on Escape key
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<button
				type="button"
				className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
				onClick={onClose}
				aria-label="Close accessibility settings"
			>
				{/* Panel */}
				<div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
					<div
						className={cn(
							"relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all",
							"sm:my-8 sm:w-full sm:max-w-lg",
						)}
					>
						{/* Header */}
						<div className="bg-gray-50 px-4 py-3 border-b">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-medium text-gray-900">
									Accessibility Settings
								</h3>
								<button
									type="button"
									className={cn(
										"text-gray-400 hover:text-gray-500",
										"focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
									)}
									onClick={onClose}
									aria-label="Close"
								>
									<span className="sr-only">Close</span>
									<svg
										className="h-6 w-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										aria-hidden="true"
									>
										<title>Close accessibility settings</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="px-4 py-5 sm:p-6">
							<div className="space-y-6">
								{/* Display Settings */}
								<div>
									<h4 className="text-md font-medium text-gray-900 mb-3">
										Display
									</h4>
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">
												High Contrast
											</span>
											<button
												type="button"
												className={toggleRootClass(isHighContrast)}
												onClick={toggleHighContrast}
												aria-pressed={isHighContrast ? "true" : "false"}
												aria-labelledby="high-contrast-label"
											>
												<span className="sr-only">Toggle high contrast</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(isHighContrast)}
												/>
											</button>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">
												Reduced Motion
											</span>
											<button
												type="button"
												className={toggleRootClass(isReducedMotion)}
												onClick={toggleReducedMotion}
												aria-pressed={isReducedMotion ? "true" : "false"}
												aria-labelledby="reduced-motion-label"
											>
												<span className="sr-only">Toggle reduced motion</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(isReducedMotion)}
												/>
											</button>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">Large Text</span>
											<button
												type="button"
												className={toggleRootClass(settings.largeText)}
												onClick={() =>
													handleSettingsChange({
														largeText: !settings.largeText,
													})
												}
												aria-pressed={settings.largeText ? "true" : "false"}
												aria-labelledby="large-text-label"
											>
												<span className="sr-only">Toggle large text</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(settings.largeText)}
												/>
											</button>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">
												Dyslexia Friendly
											</span>
											<button
												type="button"
												className={toggleRootClass(settings.dyslexiaFriendly)}
												onClick={() =>
													handleSettingsChange({
														dyslexiaFriendly: !settings.dyslexiaFriendly,
													})
												}
												aria-pressed={
													settings.dyslexiaFriendly ? "true" : "false"
												}
												aria-labelledby="dyslexia-friendly-label"
											>
												<span className="sr-only">
													Toggle dyslexia friendly
												</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(
														settings.dyslexiaFriendly,
													)}
												/>
											</button>
										</div>
									</div>
								</div>

								{/* Navigation Settings */}
								<div>
									<h4 className="text-md font-medium text-gray-900 mb-3">
										Navigation
									</h4>
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">
												Keyboard Navigation
											</span>
											<button
												type="button"
												className={toggleRootClass(isKeyboardNavigationEnabled)}
												onClick={
													isKeyboardNavigationEnabled
														? disableKeyboardNavigation
														: enableKeyboardNavigation
												}
												aria-pressed={
													isKeyboardNavigationEnabled ? "true" : "false"
												}
												aria-labelledby="keyboard-navigation-label"
											>
												<span className="sr-only">
													Toggle keyboard navigation
												</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(
														isKeyboardNavigationEnabled,
													)}
												/>
											</button>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">
												Screen Reader Mode
											</span>
											<button
												type="button"
												className={toggleRootClass(settings.screenReaderMode)}
												onClick={() =>
													handleSettingsChange({
														screenReaderMode: !settings.screenReaderMode,
													})
												}
												aria-pressed={
													settings.screenReaderMode ? "true" : "false"
												}
												aria-labelledby="screen-reader-mode-label"
											>
												<span className="sr-only">
													Toggle screen reader mode
												</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(
														settings.screenReaderMode,
													)}
												/>
											</button>
										</div>
									</div>
								</div>

								{/* Announcement Settings */}
								<div>
									<h4 className="text-md font-medium text-gray-900 mb-3">
										Announcements
									</h4>
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">
												Action Announcements
											</span>
											<button
												type="button"
												className={toggleRootClass(settings.announceActions)}
												onClick={() =>
													handleSettingsChange({
														announceActions: !settings.announceActions,
													})
												}
												aria-pressed={
													settings.announceActions ? "true" : "false"
												}
												aria-labelledby="announce-actions-label"
											>
												<span className="sr-only">
													Toggle action announcements
												</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(settings.announceActions)}
												/>
											</button>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">
												Progress Announcements
											</span>
											<button
												type="button"
												className={toggleRootClass(settings.announceProgress)}
												onClick={() =>
													handleSettingsChange({
														announceProgress: !settings.announceProgress,
													})
												}
												aria-pressed={
													settings.announceProgress ? "true" : "false"
												}
												aria-labelledby="announce-progress-label"
											>
												<span className="sr-only">
													Toggle progress announcements
												</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(
														settings.announceProgress,
													)}
												/>
											</button>
										</div>

										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-700">
												Error Announcements
											</span>
											<button
												type="button"
												className={toggleRootClass(settings.announceErrors)}
												onClick={() =>
													handleSettingsChange({
														announceErrors: !settings.announceErrors,
													})
												}
												aria-pressed={
													settings.announceErrors ? "true" : "false"
												}
												aria-labelledby="announce-errors-label"
											>
												<span className="sr-only">
													Toggle error announcements
												</span>
												<span
													aria-hidden="true"
													className={toggleThumbClass(settings.announceErrors)}
												/>
											</button>
										</div>
									</div>
								</div>

								{/* Voice Settings */}
								<div>
									<h4 className="text-md font-medium text-gray-900 mb-3">
										Voice Settings
									</h4>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label
												htmlFor="voice-speed"
												className="block text-sm font-medium text-gray-700"
											>
												Speed
											</label>
											<select
												id="voice-speed"
												className={cn(selectFieldBase, selectFieldState)}
												value={settings.voiceSpeed}
												onChange={(e) =>
													handleSettingsChange({
														voiceSpeed: e.target.value as
															| "slow"
															| "normal"
															| "fast",
													})
												}
											>
												<option value="slow">Slow</option>
												<option value="normal">Normal</option>
												<option value="fast">Fast</option>
											</select>
										</div>

										<div>
											<label
												htmlFor="voice-pitch"
												className="block text-sm font-medium text-gray-700"
											>
												Pitch
											</label>
											<select
												id="voice-pitch"
												className={cn(selectFieldBase, selectFieldState)}
												value={settings.voicePitch}
												onChange={(e) =>
													handleSettingsChange({
														voicePitch: e.target.value as
															| "low"
															| "normal"
															| "high",
													})
												}
											>
												<option value="low">Low</option>
												<option value="normal">Normal</option>
												<option value="high">High</option>
											</select>
										</div>
									</div>
								</div>

								{/* Test Announcements */}
								<div>
									<h4 className="text-md font-medium text-gray-900 mb-3">
										Test Announcements
									</h4>
									<div className="space-y-3">
										<div>
											<label
												htmlFor="test-message"
												className="block text-sm font-medium text-gray-700"
											>
												Message
											</label>
											<div className="mt-1 flex rounded-md shadow-sm">
												<input
													type="text"
													id="test-message"
													className={cn(inputFieldBase, inputFieldState)}
													placeholder="Enter test message"
													value={testMessage}
													onChange={(e) => setTestMessage(e.target.value)}
												/>
												<button
													type="button"
													className={cn(inputButtonBase, inputButtonState)}
													onClick={testAnnouncement}
												>
													Announce
												</button>
											</div>
										</div>

										<div>
											<label
												htmlFor="test-progress"
												className="block text-sm font-medium text-gray-700"
											>
												Progress
											</label>
											<div className="mt-1 flex rounded-md shadow-sm">
												<input
													type="number"
													id="test-progress"
													className={cn(inputFieldBase, inputFieldState)}
													placeholder="Enter progress percentage"
													min="0"
													max="100"
													value={testProgress || ""}
													onChange={(e) =>
														setTestProgress(Number(e.target.value))
													}
												/>
												<button
													type="button"
													className={cn(inputButtonBase, inputButtonState)}
													onClick={testProgressAnnouncement}
												>
													Announce
												</button>
											</div>
										</div>

										<div>
											<label
												htmlFor="test-error"
												className="block text-sm font-medium text-gray-700"
											>
												Error
											</label>
											<div className="mt-1 flex rounded-md shadow-sm">
												<input
													type="text"
													id="test-error"
													className={cn(inputFieldBase, inputFieldState)}
													placeholder="Enter test error message"
													value={testError}
													onChange={(e) => setTestError(e.target.value)}
												/>
												<button
													type="button"
													className={cn(inputButtonBase, inputButtonState)}
													onClick={testErrorAnnouncement}
												>
													Announce
												</button>
											</div>
										</div>

										<div className="flex space-x-2">
											<button
												type="button"
												className={cn(
													"inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium",
													"rounded-md shadow-sm text-white bg-indigo-600",
													"hover:bg-indigo-700 focus:outline-none focus:ring-2",
													"focus:ring-offset-2 focus:ring-indigo-500",
												)}
												onClick={testActionAnnouncement}
											>
												Test Action
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
							<button
								type="button"
								className={cn(
									"mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold",
									"text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300",
									"hover:bg-gray-50 sm:mt-0 sm:w-auto",
								)}
								onClick={onClose}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</button>
		</div>
	);
};

export default AccessibilityPanel;
