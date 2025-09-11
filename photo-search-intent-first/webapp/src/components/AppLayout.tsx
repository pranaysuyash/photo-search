import type React from "react";
import {
	AccessibilityPanel,
	type AccessibilitySettings,
} from "./AccessibilityPanel";
import { ErrorBoundary } from "./ErrorBoundary";
import { HintManager, HintProvider } from "./HintSystem";
import { MobileOptimizations } from "./MobileOptimizations";
import { OnboardingTour } from "./OnboardingTour";
import { ThemeProvider } from "./ThemeProvider";

interface AppLayoutProps {
	children: React.ReactNode;
	isMobile: boolean;
	showAccessibilityPanel: boolean;
	showOnboardingTour: boolean;
	onAccessibilityClose: () => void;
	onOnboardingComplete: () => void;
	onOnboardingSkip: () => void;
	onSwipeLeft: () => void;
	onSwipeRight: () => void;
	onSwipeUp: () => void;
	onPullToRefresh: () => void;
	accessibilitySettings?: AccessibilitySettings;
	onAccessibilitySettingsChange?: (settings: AccessibilitySettings) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
	children,
	isMobile,
	showAccessibilityPanel,
	showOnboardingTour,
	onAccessibilityClose,
	onOnboardingComplete,
	onOnboardingSkip,
	onSwipeLeft,
	onSwipeRight,
	onSwipeUp,
	onPullToRefresh,
	accessibilitySettings,
	onAccessibilitySettingsChange,
}) => {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<HintProvider>
					<HintManager>
						<MobileOptimizations
							onSwipeLeft={onSwipeLeft}
							onSwipeRight={onSwipeRight}
							onSwipeUp={onSwipeUp}
							enableSwipeGestures={isMobile}
							enablePullToRefresh={true}
							onPullToRefresh={onPullToRefresh}
						>
							{children}

							{/* Modern UX Integration - Accessibility Panel */}
							{showAccessibilityPanel && (
								<AccessibilityPanel
									isOpen={showAccessibilityPanel}
									onClose={onAccessibilityClose}
									onSettingsChange={onAccessibilitySettingsChange || (() => {})}
								/>
							)}

							{/* Modern UX Integration - Onboarding Tour */}
							{showOnboardingTour && (
								<OnboardingTour
									isActive={showOnboardingTour}
									onComplete={onOnboardingComplete}
									onSkip={onOnboardingSkip}
								/>
							)}
						</MobileOptimizations>
					</HintManager>
				</HintProvider>
			</ThemeProvider>
		</ErrorBoundary>
	);
};
