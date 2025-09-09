import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useLibrary, useLibHasMore, useSettingsActions } from '../stores/useStores'
import { apiIndex, apiLibrary } from '../api'

type LibraryState = {
  paths: string[]
  hasMore: boolean
  isIndexing: boolean
}

type LibraryActions = {
  index: (opts?: { dir?: string; provider?: string }) => Promise<void>
  load: (opts?: { dir?: string; provider?: string; limit?: number; offset?: number; append?: boolean }) => Promise<void>
}

const Ctx = createContext<{ state: LibraryState; actions: LibraryActions } | null>(null)

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const lib = useLibrary() || []
  const hasMore = !!useLibHasMore()
  const [isIndexing, setIsIndexing] = useState(false)
  const settings = useSettingsActions() as any

  const index = useCallback(async (opts?: { dir?: string; provider?: string }) => {
    const dir = opts?.dir || settings?.state?.dir
    const provider = opts?.provider || settings?.state?.engine || 'local'
    if (!dir) return
    try {
      setIsIndexing(true)
      await apiIndex(dir, provider)
    } finally {
      setIsIndexing(false)
    }
  }, [settings])

  const load = useCallback(async (opts?: { dir?: string; provider?: string; limit?: number; offset?: number; append?: boolean }) => {
    const dir = opts?.dir || settings?.state?.dir
    const provider = opts?.provider || settings?.state?.engine || 'local'
    if (!dir) return
    await apiLibrary(dir, provider, opts?.limit ?? 120, opts?.offset ?? 0)
  }, [settings])

  const value = useMemo(() => ({
    state: { paths: lib, hasMore, isIndexing },
    actions: { index, load },
  }), [lib, hasMore, isIndexing, index, load])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLibraryContext() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLibraryContext must be used within LibraryProvider')
  return v
}

