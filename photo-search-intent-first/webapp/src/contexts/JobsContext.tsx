import type React from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Job } from "../components/JobsCenter";

type JobsState = {
  jobs: Job[];
};

type JobsActions = {
  add: (job: Job) => void;
  setStatus: (id: string, status: Job["status"]) => void;
  update: (id: string, patch: Partial<Job>) => void;
  remove: (id: string) => void;
  clearStopped: () => void; // keep running/queued only
};

const Ctx = createContext<{ state: JobsState; actions: JobsActions } | null>(null);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  const add = useCallback((job: Job) => {
    setJobs((prev) => [...prev, job]);
  }, []);

  const setStatus = useCallback((id: string, status: Job["status"]) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  }, []);

  const update = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const remove = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const clearStopped = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status === "running" || j.status === "queued"));
  }, []);

  const value = useMemo(
    () => ({ state: { jobs }, actions: { add, setStatus, update, remove, clearStopped } }),
    [jobs, add, setStatus, update, remove, clearStopped],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJobsContext() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useJobsContext must be used within JobsProvider");
  return v;
}

