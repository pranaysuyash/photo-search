// Backup of original App.tsx before Zustand migration
import React, { useEffect, useMemo, useState } from 'react'
import {
  apiIndex, apiSearch, apiSearchWorkspace, apiFeedback,
  apiGetFavorites, apiSetFavorite,
  apiGetSaved, apiAddSaved, apiDeleteSaved,
  apiMap, apiDiagnostics, apiBuildFast, apiBuildOCR, apiLookalikes, apiResolveLookalike,
  apiGetTags, apiSetTags, thumbUrl, thumbFaceUrl, apiOpen, apiWorkspaceList, apiWorkspaceAdd, apiWorkspaceRemove, apiEditOps, apiUpscale, apiLibrary,
  apiBuildFaces, apiFacesClusters, apiFacesName,
  type SearchResult,
} from './api'

const engines = [
  { key: 'local', label: 'On-device (Recommended)' },
  { key: 'local-compat', label: 'On-device (Compatible)' },
  { key: 'hf', label: 'Hugging Face (CLIP)' },
  { key: 'hf-caption', label: 'Hugging Face (Caption)' },
  { key: 'openai', label: 'OpenAI (Captions)' },
]

const basename = (p: string) => p.split('/').pop() || p

export default function App() {
  const [dir, setDir] = useState('')
  const [engine, setEngine] = useState('local')
  const [hfToken, setHfToken] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(24)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchId, setSearchId] = useState('')
  const [fav, setFav] = useState<string[]>([])
  const [favOnly, setFavOnly] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({})
  const [tagFilter, setTagFilter] = useState('')
  const [saved, setSaved] = useState<{ name: string; query: string; top_k?: number }[]>([])
  const [points, setPoints] = useState<{ lat: number; lon: number }[]>([])
  const [diag, setDiag] = useState<{ folder: string; engines: { key: string; index_dir: string; count: number; fast?: { annoy: boolean; faiss: boolean; hnsw: boolean } }[]; free_gb: number; os: string } | null>(null)
  const [groups, setGroups] = useState<{ id: string; paths: string[]; resolved: boolean }[]>([])
  const [clusters, setClusters] = useState<{ id: string; name?: string; size: number; examples: [string, number][] }[]>([])
  const [persons, setPersons] = useState<string[]>([])
  const [useFast, setUseFast] = useState(false)
  const [fastKind, setFastKind] = useState<'annoy'|'faiss'|'hnsw'|''>('')
  const [useCaps, setUseCaps] = useState(false)
  const [vlmModel, setVlmModel] = useState('Qwen/Qwen2-VL-2B-Instruct')
  const [camera, setCamera] = useState('')
  const [isoMin, setIsoMin] = useState('')
  const [isoMax, setIsoMax] = useState('')
  const [fMin, setFMin] = useState('')
  const [fMax, setFMax] = useState('')
  const [place, setPlace] = useState('')
  const [useOcr, setUseOcr] = useState(false)
  const [hasText, setHasText] = useState(false)
  const [workspace, setWorkspace] = useState<string[]>([])
  const [wsToggle, setWsToggle] = useState(false)
  const [viewMode, setViewMode] = useState<'grid'|'film'>('grid')
  const [collections, setCollections] = useState<Record<string,string[]>>({})
  const [library, setLibrary] = useState<string[]>([])
  const [smart, setSmart] = useState<Record<string, any>>({})
  const [showWelcome, setShowWelcome] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const needsHf = engine.startsWith('hf')
  const needsOAI = engine === 'openai'

  // ... rest of the original functions would be here
  return <div>Original App with useState hooks (backup)</div>
}