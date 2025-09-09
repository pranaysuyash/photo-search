import React from 'react'
import { HashRouter } from 'react-router-dom'
import { SimpleStoreProvider } from './stores/SimpleStore'
import { SearchProvider } from './contexts/SearchContext'
import { LibraryProvider } from './contexts/LibraryContext'
import { UIProvider } from './contexts/UIContext'
import { SettingsProvider } from './contexts/SettingsContext'

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <HashRouter>
      <SimpleStoreProvider>
        <SettingsProvider>
          <UIProvider>
            <LibraryProvider>
              <SearchProvider>
                {children}
              </SearchProvider>
            </LibraryProvider>
          </UIProvider>
        </SettingsProvider>
      </SimpleStoreProvider>
    </HashRouter>
  )
}

