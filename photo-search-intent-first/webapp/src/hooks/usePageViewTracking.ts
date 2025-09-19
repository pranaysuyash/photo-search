import { useEffect } from "react";
import { monitoringService } from "../services/MonitoringService";

export function usePageViewTracking() {
	useEffect(() => {
		monitoringService.trackPageView(window.location.pathname, document.title);
	}, []);
}

export default usePageViewTracking;
