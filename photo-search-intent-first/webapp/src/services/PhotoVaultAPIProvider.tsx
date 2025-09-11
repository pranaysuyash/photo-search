import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
	useDir,
	useEngine,
	useHfToken,
	useOpenaiKey,
} from "../stores/useStores";
import { getAPI, initializeAPI, type PhotoVaultAPI } from "./PhotoVaultAPI";

const Ctx = createContext<PhotoVaultAPI | null>(null);

export function PhotoVaultAPIProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const dir = useDir();
	const provider = useEngine();
	const hfToken = useHfToken();
	const openaiKey = useOpenaiKey();

	const config = useMemo(
		() => ({
			dir: dir || "",
			provider: provider || "local",
			hfToken,
			openaiKey,
		}),
		[dir, provider, hfToken, openaiKey],
	);

	const [svc, setSvc] = useState<PhotoVaultAPI | null>(null);

	useEffect(() => {
		if (!config.dir || !config.provider) {
			setSvc(null);
			return;
		}
		const inst = initializeAPI(config);
		setSvc(inst);
	}, [config.dir, config.provider, config.hfToken, config.openaiKey, config]);

	return <Ctx.Provider value={svc}>{children}</Ctx.Provider>;
}

export function usePhotoVaultAPI(): PhotoVaultAPI {
	const v = useContext(Ctx);
	if (!v) {
		// Fallback to singleton if provider not ready (e.g., early splash)
		try {
			return getAPI();
		} catch {
			throw new Error("PhotoVaultAPI not available yet: missing dir/provider");
		}
	}
	return v;
}
