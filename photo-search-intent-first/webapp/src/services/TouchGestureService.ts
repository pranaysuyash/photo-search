/**
 * Enhanced Touch Gesture Service for Mobile Photo Interactions
 * Provides pinch-to-zoom, pan, swipe navigation, and pull-to-refresh
 */

import * as React from "react";

export interface TouchPoint {
	x: number;
	y: number;
	id: number;
}

export interface TouchGestureState {
	isPinching: boolean;
	isPanning: boolean;
	isSwiping: boolean;
	scale: number;
	translateX: number;
	translateY: number;
	lastScale: number;
	lastTranslateX: number;
	lastTranslateY: number;
}

export interface SwipeDirection {
	left: boolean;
	right: boolean;
	up: boolean;
	down: boolean;
}

export interface TouchGestureConfig {
	minSwipeDistance?: number;
	maxSwipeTime?: number;
	minPinchDistance?: number;
	maxScale?: number;
	minScale?: number;
	doubleTapZoom?: number;
	enablePullToRefresh?: boolean;
	pullToRefreshThreshold?: number;
}

const DEFAULT_CONFIG: TouchGestureConfig = {
	minSwipeDistance: 50,
	maxSwipeTime: 300,
	minPinchDistance: 10,
	maxScale: 5,
	minScale: 0.5,
	doubleTapZoom: 2,
	enablePullToRefresh: true,
	pullToRefreshThreshold: 80,
};

export class TouchGestureService {
	private config: TouchGestureConfig;
	private touchStartPoints: TouchPoint[] = [];
	private gestureState: TouchGestureState = {
		isPinching: false,
		isPanning: false,
		isSwiping: false,
		scale: 1,
		translateX: 0,
		translateY: 0,
		lastScale: 1,
		lastTranslateX: 0,
		lastTranslateY: 0,
	};
	private touchStartTime = 0;
	private lastTouchEndTime = 0;
	private doubleTapTimer: number | null = null;
	private pullStartY = 0;
	private isPulling = false;
	private onSwipeCallback?: (direction: SwipeDirection) => void;
	private onPinchCallback?: (
		scale: number,
		centerX: number,
		centerY: number,
	) => void;
	private onPanCallback?: (deltaX: number, deltaY: number) => void;
	private onDoubleTapCallback?: (x: number, y: number) => void;
	private onPullToRefreshCallback?: () => void;

	constructor(config: TouchGestureConfig = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	// Public API
	onSwipe(callback: (direction: SwipeDirection) => void) {
		this.onSwipeCallback = callback;
		return this;
	}

	onPinch(callback: (scale: number, centerX: number, centerY: number) => void) {
		this.onPinchCallback = callback;
		return this;
	}

	onPan(callback: (deltaX: number, deltaY: number) => void) {
		this.onPanCallback = callback;
		return this;
	}

	onDoubleTap(callback: (x: number, y: number) => void) {
		this.onDoubleTapCallback = callback;
		return this;
	}

	onPullToRefresh(callback: () => void) {
		this.onPullToRefreshCallback = callback;
		return this;
	}

	// Touch event handlers
	handleTouchStart(e: TouchEvent) {
		this.touchStartTime = Date.now();
		this.touchStartPoints = Array.from(e.touches).map((touch) => ({
			x: touch.clientX,
			y: touch.clientY,
			id: touch.identifier,
		}));

		// Handle double tap detection
		const now = Date.now();
		if (this.doubleTapTimer && now - this.lastTouchEndTime < 300) {
			// Double tap detected
			this.handleDoubleTap(
				this.touchStartPoints[0].x,
				this.touchStartPoints[0].y,
			);
			this.clearDoubleTapTimer();
		} else {
			this.startDoubleTapTimer();
		}

		// Store current state for gesture calculations
		this.gestureState.lastScale = this.gestureState.scale;
		this.gestureState.lastTranslateX = this.gestureState.translateX;
		this.gestureState.lastTranslateY = this.gestureState.translateY;

		// Pull-to-refresh detection
		if (this.config.enablePullToRefresh && this.isAtTopOfPage()) {
			this.pullStartY = this.touchStartPoints[0].y;
			this.isPulling = true;
		}
	}

	handleTouchMove(e: TouchEvent) {
		e.preventDefault();
		const currentPoints = Array.from(e.touches).map((touch) => ({
			x: touch.clientX,
			y: touch.clientY,
			id: touch.identifier,
		}));

		if (currentPoints.length === 1) {
			this.handleSingleTouchMove(currentPoints[0]);
		} else if (currentPoints.length === 2) {
			this.handlePinchMove(currentPoints);
		}
	}

	handleTouchEnd(e: TouchEvent) {
		const touchDuration = Date.now() - this.touchStartTime;
		this.lastTouchEndTime = Date.now();

		if (
			this.gestureState.isSwiping &&
			touchDuration < (this.config.maxSwipeTime ?? 500)
		) {
			this.handleSwipe(e.changedTouches[0]);
		}

		// Reset gesture states
		this.gestureState.isPinching = false;
		this.gestureState.isPanning = false;
		this.gestureState.isSwiping = false;
		this.isPulling = false;
	}

	// Private methods
	private handleSingleTouchMove(touch: TouchPoint) {
		const startPoint = this.touchStartPoints[0];
		if (!startPoint) return;

		const deltaX = touch.x - startPoint.x;
		const deltaY = touch.y - startPoint.y;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Pull-to-refresh handling
		if (this.isPulling && this.config.enablePullToRefresh) {
			const pullDistance = touch.y - this.pullStartY;
			if (pullDistance > (this.config.pullToRefreshThreshold ?? 100)) {
				this.triggerPullToRefresh();
				this.isPulling = false;
				return;
			}
		}

		// Pan handling (when zoomed in)
		if (this.gestureState.scale > 1) {
			this.gestureState.isPanning = true;
			this.gestureState.translateX = this.gestureState.lastTranslateX + deltaX;
			this.gestureState.translateY = this.gestureState.lastTranslateY + deltaY;

			if (this.onPanCallback) {
				this.onPanCallback(deltaX, deltaY);
			}
			return;
		}

		// Swipe detection
		if (
			distance > (this.config.minSwipeDistance ?? 50) &&
			!this.gestureState.isPanning
		) {
			this.gestureState.isSwiping = true;
		}
	}

	private handlePinchMove(touches: TouchPoint[]) {
		if (touches.length !== 2) return;

		const start1 = this.touchStartPoints.find((p) => p.id === touches[0].id);
		const start2 = this.touchStartPoints.find((p) => p.id === touches[1].id);

		if (!start1 || !start2) return;

		const startDistance = this.getDistance(start1, start2);
		const currentDistance = this.getDistance(touches[0], touches[1]);

		if (
			Math.abs(currentDistance - startDistance) >
			(this.config.minPinchDistance ?? 30)
		) {
			this.gestureState.isPinching = true;

			const scale =
				(currentDistance / startDistance) * this.gestureState.lastScale;
			const clampedScale = Math.max(
				this.config.minScale ?? 0.5,
				Math.min(this.config.maxScale ?? 3, scale),
			);

			const centerX = (touches[0].x + touches[1].x) / 2;
			const centerY = (touches[0].y + touches[1].y) / 2;

			this.gestureState.scale = clampedScale;

			if (this.onPinchCallback) {
				this.onPinchCallback(clampedScale, centerX, centerY);
			}
		}
	}

	private handleSwipe(endTouch: Touch) {
		const startPoint = this.touchStartPoints[0];
		if (!startPoint) return;

		const deltaX = endTouch.clientX - startPoint.x;
		const deltaY = endTouch.clientY - startPoint.y;
		const absDeltaX = Math.abs(deltaX);
		const absDeltaY = Math.abs(deltaY);

		// Only trigger swipe if horizontal movement is dominant
		if (
			absDeltaX > absDeltaY &&
			absDeltaX > (this.config.minSwipeDistance ?? 50)
		) {
			const direction: SwipeDirection = {
				left: deltaX < 0,
				right: deltaX > 0,
				up: false,
				down: false,
			};

			if (this.onSwipeCallback) {
				this.onSwipeCallback(direction);
			}
		}
	}

	private handleDoubleTap(x: number, y: number) {
		if (this.onDoubleTapCallback) {
			this.onDoubleTapCallback(x, y);
		}
	}

	private triggerPullToRefresh() {
		if (this.onPullToRefreshCallback) {
			this.onPullToRefreshCallback();
		}
	}

	private getDistance(p1: TouchPoint, p2: TouchPoint): number {
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	private isAtTopOfPage(): boolean {
		return window.scrollY <= 10;
	}

	private startDoubleTapTimer() {
		this.clearDoubleTapTimer();
		this.doubleTapTimer = window.setTimeout(() => {
			this.doubleTapTimer = null;
		}, 300);
	}

	private clearDoubleTapTimer() {
		if (this.doubleTapTimer) {
			clearTimeout(this.doubleTapTimer);
			this.doubleTapTimer = null;
		}
	}

	// Utility methods
	reset() {
		this.gestureState = {
			isPinching: false,
			isPanning: false,
			isSwiping: false,
			scale: 1,
			translateX: 0,
			translateY: 0,
			lastScale: 1,
			lastTranslateX: 0,
			lastTranslateY: 0,
		};
		this.touchStartPoints = [];
		this.isPulling = false;
	}

	getScale(): number {
		return this.gestureState.scale;
	}

	getTranslation(): { x: number; y: number } {
		return {
			x: this.gestureState.translateX,
			y: this.gestureState.translateY,
		};
	}

	isGestureActive(): boolean {
		return (
			this.gestureState.isPinching ||
			this.gestureState.isPanning ||
			this.gestureState.isSwiping
		);
	}
}

// React hook for easy integration
export function useTouchGestures(
	elementRef: React.RefObject<HTMLElement>,
	config?: TouchGestureConfig,
) {
	const gestureService = React.useRef<TouchGestureService>();

	React.useEffect(() => {
		if (!elementRef.current) return;

		gestureService.current = new TouchGestureService(config);

		const element = elementRef.current;

		const handleTouchStart = (e: TouchEvent) => {
			gestureService.current?.handleTouchStart(e);
		};

		const handleTouchMove = (e: TouchEvent) => {
			gestureService.current?.handleTouchMove(e);
		};

		const handleTouchEnd = (e: TouchEvent) => {
			gestureService.current?.handleTouchEnd(e);
		};

		element.addEventListener("touchstart", handleTouchStart, {
			passive: false,
		});
		element.addEventListener("touchmove", handleTouchMove, { passive: false });
		element.addEventListener("touchend", handleTouchEnd, { passive: false });

		return () => {
			element.removeEventListener("touchstart", handleTouchStart);
			element.removeEventListener("touchmove", handleTouchMove);
			element.removeEventListener("touchend", handleTouchEnd);
		};
	}, [elementRef, config]);

	return gestureService.current;
}
