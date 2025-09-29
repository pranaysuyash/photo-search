// Connectivity history logging service for diagnostics
export interface ConnectivityEvent {
	id: string;
	timestamp: number;
	type:
		| "online"
		| "offline"
		| "quality_change"
		| "sync_start"
		| "sync_complete"
		| "sync_error";
	details: {
		reason?: string;
		networkQuality?: number;
		latency?: number;
		actionsSynced?: number;
		actionsFailed?: number;
		error?: string;
		duration?: number;
	};
}

export interface ConnectivityStats {
	totalEvents: number;
	onlineEvents: number;
	offlineEvents: number;
	syncEvents: number;
	errorEvents: number;
	averageNetworkQuality: number;
	lastOnlineTime?: number;
	lastOfflineTime?: number;
	currentUptime: number;
	longestUptime: number;
	shortestDowntime: number;
	totalDowntime: number;
}

const MAX_EVENTS = 1000; // Keep last 1000 events
const MAX_STATS_HISTORY = 100; // Keep stats for last 100 sessions

class ConnectivityHistoryService {
	private readonly STORAGE_KEY = "connectivity_history";
	private readonly STATS_KEY = "connectivity_stats";
	private events: ConnectivityEvent[] = [];
	private sessionStart: number = Date.now();
	private isOnline: boolean = navigator.onLine;

	constructor() {
		this.loadHistory();
		this.setupEventListeners();
		this.logCurrentState();
	}

	private setupEventListeners() {
		window.addEventListener("online", () => this.handleOnline());
		window.addEventListener("offline", () => this.handleOffline());

		// Periodic quality check
		setInterval(() => this.checkNetworkQuality(), 60000); // Check every minute
	}

	private logCurrentState() {
		this.logEvent(this.isOnline ? "online" : "offline", {
			reason: "initial_state",
		});
	}

	private handleOnline() {
		this.isOnline = true;
		this.logEvent("online", {
			reason: "network_event",
		});
	}

	private handleOffline() {
		this.isOnline = false;
		this.logEvent("offline", {
			reason: "network_event",
		});
	}

	private async checkNetworkQuality() {
		try {
			const start = Date.now();
			const _response = await fetch("/api/monitoring", {
				method: "GET",
				cache: "no-store",
				headers: { Accept: "application/json" },
			});
			const end = Date.now();
			const latency = end - start;

			const quality = Math.max(0, Math.min(1, 1000 / latency));

			// Check if quality changed significantly
			const lastEvent = this.events[this.events.length - 1];
			if (
				!lastEvent ||
				!lastEvent.details.networkQuality ||
				Math.abs(lastEvent.details.networkQuality - quality) > 0.2
			) {
				this.logEvent("quality_change", {
					networkQuality: quality,
					latency,
				});
			}
		} catch (error) {
			this.logEvent("quality_change", {
				networkQuality: 0,
				latency: undefined,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	private logEvent(
		type: ConnectivityEvent["type"],
		details: ConnectivityEvent["details"],
	) {
		const event: ConnectivityEvent = {
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: Date.now(),
			type,
			details,
		};

		this.events.push(event);

		// Trim events to max size
		if (this.events.length > MAX_EVENTS) {
			this.events = this.events.slice(-MAX_EVENTS);
		}

		this.saveHistory();
		this.updateStats(event);
	}

	private updateStats(event: ConnectivityEvent) {
		const stats = this.getLatestStats();

		// Update basic counters
		stats.totalEvents++;

		switch (event.type) {
			case "online":
				stats.onlineEvents++;
				stats.lastOnlineTime = event.timestamp;
				if (stats.lastOfflineTime) {
					const downtime = event.timestamp - stats.lastOfflineTime;
					stats.totalDowntime += downtime;
					if (!stats.shortestDowntime || downtime < stats.shortestDowntime) {
						stats.shortestDowntime = downtime;
					}
				}
				break;
			case "offline":
				stats.offlineEvents++;
				stats.lastOfflineTime = event.timestamp;
				if (stats.lastOnlineTime) {
					const uptime = event.timestamp - stats.lastOnlineTime;
					if (uptime > stats.longestUptime) {
						stats.longestUptime = uptime;
					}
				}
				break;
			case "sync_start":
			case "sync_complete":
			case "sync_error":
				stats.syncEvents++;
				break;
		}

		if (event.type === "sync_error") {
			stats.errorEvents++;
		}

		// Update network quality average
		if (event.details.networkQuality !== undefined) {
			const qualityEvents = this.events.filter(
				(e) => e.details.networkQuality !== undefined,
			);
			const avgQuality =
				qualityEvents.reduce(
					(sum, e) => sum + (e.details.networkQuality || 0),
					0,
				) / qualityEvents.length;
			stats.averageNetworkQuality = avgQuality;
		}

		// Update current uptime
		if (this.isOnline && stats.lastOnlineTime) {
			stats.currentUptime = Date.now() - stats.lastOnlineTime;
		}

		this.saveStats(stats);
	}

	public logSyncStart() {
		this.logEvent("sync_start", {});
	}

	public logSyncComplete(
		actionsSynced: number,
		actionsFailed: number,
		duration: number,
	) {
		this.logEvent("sync_complete", {
			actionsSynced,
			actionsFailed,
			duration,
		});
	}

	public logSyncError(
		error: string,
		actionsSynced: number,
		actionsFailed: number,
	) {
		this.logEvent("sync_error", {
			error,
			actionsSynced,
			actionsFailed,
		});
	}

	public getEvents(limit: number = 100): ConnectivityEvent[] {
		return this.events.slice(-limit).reverse(); // Most recent first
	}

	public getEventsByType(
		type: ConnectivityEvent["type"],
		limit: number = 100,
	): ConnectivityEvent[] {
		return this.events
			.filter((e) => e.type === type)
			.slice(-limit)
			.reverse();
	}

	public getEventsByTimeRange(start: number, end: number): ConnectivityEvent[] {
		return this.events
			.filter((e) => e.timestamp >= start && e.timestamp <= end)
			.reverse();
	}

	public getLatestStats(): ConnectivityStats {
		try {
			const stored = localStorage.getItem(this.STATS_KEY);
			if (stored) {
				const stats = JSON.parse(stored);
				// Update current uptime if online
				if (this.isOnline && stats.lastOnlineTime) {
					stats.currentUptime = Date.now() - stats.lastOnlineTime;
				}
				return stats;
			}
		} catch (error) {
			console.error("[ConnectivityHistory] Failed to load stats:", error);
		}

		// Return default stats
		return {
			totalEvents: 0,
			onlineEvents: 0,
			offlineEvents: 0,
			syncEvents: 0,
			errorEvents: 0,
			averageNetworkQuality: 0,
			currentUptime: 0,
			longestUptime: 0,
			shortestDowntime: 0,
			totalDowntime: 0,
		};
	}

	public getStatsHistory(limit: number = 10): ConnectivityStats[] {
		try {
			const stored = localStorage.getItem(`${this.STATS_KEY}_history`);
			if (stored) {
				const history = JSON.parse(stored);
				return history.slice(-limit);
			}
		} catch (error) {
			console.error(
				"[ConnectivityHistory] Failed to load stats history:",
				error,
			);
		}
		return [];
	}

	public clearHistory() {
		this.events = [];
		localStorage.removeItem(this.STORAGE_KEY);
		localStorage.removeItem(this.STATS_KEY);
		localStorage.removeItem(`${this.STATS_KEY}_history`);

		// Reset stats
		const defaultStats: ConnectivityStats = {
			totalEvents: 0,
			onlineEvents: 0,
			offlineEvents: 0,
			syncEvents: 0,
			errorEvents: 0,
			averageNetworkQuality: 0,
			currentUptime: 0,
			longestUptime: 0,
			shortestDowntime: 0,
			totalDowntime: 0,
		};
		this.saveStats(defaultStats);
	}

	public exportHistory(): string {
		const data = {
			events: this.events,
			stats: this.getLatestStats(),
			statsHistory: this.getStatsHistory(),
			exportedAt: Date.now(),
			sessionStart: this.sessionStart,
		};
		return JSON.stringify(data, null, 2);
	}

	public importHistory(jsonData: string): boolean {
		try {
			const data = JSON.parse(jsonData);

			// Validate data structure
			if (!data.events || !Array.isArray(data.events)) {
				throw new Error("Invalid history data");
			}

			this.events = data.events.slice(-MAX_EVENTS); // Ensure we don't exceed max size

			if (data.stats) {
				this.saveStats(data.stats);
			}

			if (data.statsHistory && Array.isArray(data.statsHistory)) {
				localStorage.setItem(
					`${this.STATS_KEY}_history`,
					JSON.stringify(data.statsHistory),
				);
			}

			this.saveHistory();
			return true;
		} catch (error) {
			console.error("[ConnectivityHistory] Failed to import history:", error);
			return false;
		}
	}

	private loadHistory() {
		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			if (stored) {
				this.events = JSON.parse(stored);

				// Trim to max size
				if (this.events.length > MAX_EVENTS) {
					this.events = this.events.slice(-MAX_EVENTS);
				}
			}
		} catch (error) {
			console.error("[ConnectivityHistory] Failed to load history:", error);
			this.events = [];
		}
	}

	private saveHistory() {
		try {
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events));
		} catch (error) {
			console.error("[ConnectivityHistory] Failed to save history:", error);
		}
	}

	private saveStats(stats: ConnectivityStats) {
		try {
			localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));

			// Save to history (keep last N sessions)
			const historyKey = `${this.STATS_KEY}_history`;
			let history: ConnectivityStats[] = [];

			try {
				const stored = localStorage.getItem(historyKey);
				if (stored) {
					history = JSON.parse(stored);
				}
			} catch (error) {
				console.error(
					"[ConnectivityHistory] Failed to load stats history:",
					error,
				);
			}

			history.push(stats);
			if (history.length > MAX_STATS_HISTORY) {
				history = history.slice(-MAX_STATS_HISTORY);
			}

			localStorage.setItem(historyKey, JSON.stringify(history));
		} catch (error) {
			console.error("[ConnectivityHistory] Failed to save stats:", error);
		}
	}
}

export const connectivityHistoryService = new ConnectivityHistoryService();
