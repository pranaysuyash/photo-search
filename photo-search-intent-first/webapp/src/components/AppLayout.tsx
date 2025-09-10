import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeProvider } from "./ThemeProvider";
import { HintProvider, HintManager } from "./HintSystem";
import { MobileOptimizations } from "./MobileOptimizations";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { OnboardingTour } from "./OnboardingTour";

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
  accessibilitySettings?: any;
  onAccessibilitySettingsChange?: (settings: any) => void;
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