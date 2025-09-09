import React, { useState, useEffect } from 'react'
import { apiSearchPaginated, SearchResult } from '../api'
import { LoadingSpinner } from './LoadingSpinner'

interface PaginatedSearchProps {
  currentDir: string
  provider: string
  query: string
  searchOptions: any
  onResultsChange: (results: SearchResult[], pagination: any) => void
}

export function PaginatedSearch({ 
  currentDir, 
  provider, 
  query, 
  searchOptions, 
  onResultsChange 
}: PaginatedSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 24,
    total: 0,
    has_more: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset pagination when query changes
  useEffect(() => {
    if (query.trim()) {
      searchWithPagination(0, 24)
    } else {
      setResults([])
      setPagination({ offset: 0, limit: 24, total: 0, has_more: false })
      onResultsChange([], { offset: 0, limit: 24, total: 0, has_more: false })
    }
  }, [query, currentDir, provider, JSON.stringify(searchOptions)])

  const searchWithPagination = async (offset: number, limit: number) => {
    if (!query.trim()) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await apiSearchPaginated(
        currentDir,
        query,
        provider,
        limit,
        offset,
        searchOptions
      )

      const newResults = offset === 0 ? result.results : [...results, ...result.results]
      setResults(newResults)
      setPagination(result.pagination)
      onResultsChange(newResults, result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      console.error('Paginated search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && pagination.has_more) {
      searchWithPagination(pagination.offset + pagination.limit, pagination.limit)
    }
  }

  const changePageSize = (newLimit: number) => {
    if (newLimit !== pagination.limit) {
      searchWithPagination(0, newLimit)
    }
  }

  if (!query.trim()) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Search Stats and Controls */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded">
        <div className="text-sm text-gray-600">
          {loading && pagination.offset === 0 ? (
            <span>Searching...</span>
          ) : (
            <span>
              Showing {Math.min(results.length, pagination.total)} of {pagination.total} results
              {pagination.total > results.length && (
                <span className="text-blue-600 ml-1">
                  ({pagination.total - results.length} more available)
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2 text-sm">
            <label>Results per page:</label>
            <select
              value={pagination.limit}
              onChange={(e) => changePageSize(Number(e.target.value))}
              disabled={loading}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Load More Button */}
          {pagination.has_more && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Progress Indicator */}
      {loading && pagination.offset === 0 && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Search Results Info */}
      {results.length > 0 && (
        <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded">
          <div className="flex items-center justify-between">
            <span>
              Search completed. Found {pagination.total} total results.
            </span>
            
            {pagination.has_more && (
              <span className="text-blue-600">
                Click "Load More" to see additional results
              </span>
            )}
          </div>
          
          {/* Search Performance Indicator */}
          {pagination.total > 1000 && (
            <div className="mt-2 text-xs text-amber-600">
              💡 Large result set detected. Consider refining your search for better performance.
            </div>
          )}
        </div>
      )}

      {/* No Results Message */}
      {!loading && results.length === 0 && query.trim() && (
        <div className="text-center text-gray-500 py-8">
          <div className="text-lg mb-2">No results found</div>
          <div className="text-sm">
            Try adjusting your search terms or filters
          </div>
        </div>
      )}

      {/* Results Summary for Large Sets */}
      {results.length > 50 && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded">
          <div className="text-sm text-yellow-800">
            <strong>Performance Tip:</strong> You're viewing {results.length} results. 
            For better performance with large result sets, consider:
            <ul className="mt-2 ml-4 list-disc text-xs">
              <li>Adding more specific search terms</li>
              <li>Using filters to narrow down results</li>
              <li>Using the date range filter</li>
              <li>Searching within specific collections</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}