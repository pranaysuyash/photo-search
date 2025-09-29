import React, { useState, useEffect, useCallback } from "react";
import { ModalsHost } from "./chrome/ModalsHost";
import { EnhancedModalManager } from "./EnhancedModalManager";
import { EnhancedModalProvider } from "../contexts/EnhancedModalContext";

// Feature flag to control which modal system to use
const USE_ENHANCED_MODAL_SYSTEM = false;

interface ModalSystemWrapperProps {
	// Props for old system
	children?: React.ReactNode;
}

export function ModalSystemWrapper({ children }: ModalSystemWrapperProps) {
	const [useEnhancedSystem, setUseEnhancedSystem] = useState(USE_ENHANCED_MODAL_SYSTEM);

	// Allow runtime switching for testing
	useEffect(() => {
		if (typeof window !== "undefined") {
			// @ts-ignore - for testing purposes
			window.toggleModalSystem = () => {
				setUseEnhancedSystem(prev => !prev);
				console.log(`Switched to ${!useEnhancedSystem ? "enhanced" : "legacy"} modal system`);
			};
		}
	}, []);

	// For now, use the legacy system to ensure stability
	if (!useEnhancedSystem) {
		return <ModalsHost />;
	}

	return (
		<EnhancedModalProvider>
			<EnhancedModalManager />
			{children}
		</EnhancedModalProvider>
	);
}

// Hook to check which modal system is active
export function useModalSystem() {
	const [useEnhancedSystem] = useState(USE_ENHANCED_MODAL_SYSTEM);

	return {
		isEnhanced: useEnhancedSystem,
		systemName: useEnhancedSystem ? "enhanced" : "legacy",
		toggleSystem: () => {
			if (typeof window !== "undefined") {
				// @ts-ignore - for testing purposes
				window.toggleModalSystem?.();
			}
		}
	};
}