import { useMemo } from "react";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { WorkspaceActions, WorkspaceState } from "./types";

interface WorkspaceStore extends WorkspaceState, WorkspaceActions {}

export const useWorkspaceStore = create<WorkspaceStore>()(
	subscribeWithSelector((set, _get) => ({
		// Initial state
		workspace: [],
		wsToggle: false,
		persons: [],
		clusters: [],
		groups: [],
		points: [],
		diag: null,

		// Actions
		setWorkspace: (workspace) => set({ workspace }),
		setWsToggle: (wsToggle) => set({ wsToggle }),
		setPersons: (persons) => set({ persons }),

		addPerson: (person) =>
			set((state) => ({
				persons: state.persons.includes(person)
					? state.persons.filter((p) => p !== person)
					: [...state.persons, person],
			})),

		removePerson: (person) =>
			set((state) => ({
				persons: state.persons.filter((p) => p !== person),
			})),

		setClusters: (clusters) => set({ clusters }),
		setGroups: (groups) => set({ groups }),
		setPoints: (points) => set({ points }),
		setDiag: (diag) => set({ diag }),
	})),
);

// Selectors for optimized subscriptions
export const useWorkspace = () => useWorkspaceStore((state) => state.workspace);
export const useWsToggle = () => useWorkspaceStore((state) => state.wsToggle);
export const usePersons = () => useWorkspaceStore((state) => state.persons);
export const useClusters = () => useWorkspaceStore((state) => state.clusters);
export const useGroups = () => useWorkspaceStore((state) => state.groups);
export const usePoints = () => useWorkspaceStore((state) => state.points);
export const useDiag = () => useWorkspaceStore((state) => state.diag);

// Computed selectors
export const useHasPersons = () => {
	const persons = useWorkspaceStore((state) => state.persons);
	return persons.length > 0;
};
export const useHasWorkspace = () => {
	const workspace = useWorkspaceStore((state) => state.workspace);
	return workspace.length > 0;
};
export const useHasClusters = () => {
	const clusters = useWorkspaceStore((state) => state.clusters);
	return clusters.length > 0;
};
export const useHasGroups = () => {
	const groups = useWorkspaceStore((state) => state.groups);
	return groups.length > 0;
};
export const useHasPoints = () => {
	const points = useWorkspaceStore((state) => state.points);
	return points.length > 0;
};

// Fast index status from diagnostics
export const useFastIndexStatus = () => {
	const diag = useWorkspaceStore((state) => state.diag);
	const firstEngine = diag?.engines?.[0];
	return firstEngine?.fast || undefined;
};

// Actions selector - memoize to avoid infinite update loops
export const useWorkspaceActions = (): WorkspaceActions => {
	const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
	const setWsToggle = useWorkspaceStore((s) => s.setWsToggle);
	const setPersons = useWorkspaceStore((s) => s.setPersons);
	const addPerson = useWorkspaceStore((s) => s.addPerson);
	const removePerson = useWorkspaceStore((s) => s.removePerson);
	const setClusters = useWorkspaceStore((s) => s.setClusters);
	const setGroups = useWorkspaceStore((s) => s.setGroups);
	const setPoints = useWorkspaceStore((s) => s.setPoints);
	const setDiag = useWorkspaceStore((s) => s.setDiag);

	return useMemo(
		() => ({
			setWorkspace,
			setWsToggle,
			setPersons,
			addPerson,
			removePerson,
			setClusters,
			setGroups,
			setPoints,
			setDiag,
		}),
		[
			setWorkspace,
			setWsToggle,
			setPersons,
			addPerson,
			removePerson,
			setClusters,
			setGroups,
			setPoints,
			setDiag,
		],
	);
};
