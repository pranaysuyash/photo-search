import { useEffect, useState } from "react";

type AnnounceEvent = CustomEvent<{
	message: string;
	priority?: "polite" | "assertive";
}>;

export function GlobalAnnouncer() {
	const [msg, setMsg] = useState("");
	const [priority, setPriority] = useState<"polite" | "assertive">("polite");

	useEffect(() => {
		const onAnnounce = (e: Event) => {
			try {
				const ce = e as AnnounceEvent;
				const m = ce.detail?.message || "";
				if (m) {
					setPriority(ce.detail?.priority || "polite");
					setMsg(m);
					// Clear after a short delay so repeated messages re-announce
					setTimeout(() => setMsg(""), 1200);
				}
			} catch {}
		};
		window.addEventListener("announce", onAnnounce as EventListener);
		return () =>
			window.removeEventListener("announce", onAnnounce as EventListener);
	}, []);

	return (
		<div className="sr-only" aria-live={priority} aria-atomic="true">
			{msg}
		</div>
	);
}

export default GlobalAnnouncer;
