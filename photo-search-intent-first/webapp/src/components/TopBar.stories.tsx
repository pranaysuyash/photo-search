// Storybook is not installed - commenting out to prevent TypeScript errors
// import type { Meta, StoryObj } from '@storybook/react';
// import { TopBar } from './TopBar';
// import React from 'react';
// import { UIProvider } from '../contexts/UIContext';

/*
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UIProvider>
    <div className="p-2 bg-white dark:bg-gray-900">{children}</div>
  </UIProvider>
);

const meta = {
  title: 'Components/TopBar',
  component: TopBar,
  decorators: [
    (Story: unknown) => (
      <Wrapper>
        <Story />
      </Wrapper>
    ),
  ],
  args: {
    searchText: '',
    setSearchText: () => {},
    onSearch: () => {},
    clusters: [{ name: 'Alice' }, { name: 'Bob' }],
    allTags: ['family', 'travel'],
    meta: { cameras: ['iPhone 14'], places: ['Paris'] },
    busy: false,
    gridSize: 'medium',
    setGridSize: () => {},
    selectedView: 'results',
    setSelectedView: () => {},
    currentFilter: 'all',
    setCurrentFilter: () => {},
    ratingMin: 0,
    setRatingMin: () => {},
    setModal: () => {},
    setIsMobileMenuOpen: () => {},
    setShowFilters: () => {},
    selected: new Set<string>(),
    setSelected: () => {},
    dir: '/tmp',
    engine: 'local',
    topK: 24,
    useOsTrash: false,
    showInfoOverlay: false,
    onToggleInfoOverlay: () => {},
    resultView: 'grid',
    onChangeResultView: () => {},
    timelineBucket: 'month',
    onChangeTimelineBucket: () => {},
    diag: { engines: [{ key: 'local', index_dir: '/tmp/.photo_index', count: 1234 }] },
    isIndexing: false,
    onIndex: () => {},
    activeJobs: 0,
    onOpenJobs: () => {},
    progressPct: undefined,
    etaSeconds: undefined,
    paused: false,
    onPause: () => {},
    onResume: () => {},
    tooltip: 'indexed 1234 • coverage 76% • target 1600',
    photoActions: { setFavOnly: () => {}, setResults: () => {} },
    uiActions: { setBusy: () => {}, setNote: () => {} },
    toastTimerRef: { current: null } as unknown,
    setToast: () => {},
  }
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;
*/

// Placeholder export to prevent TypeScript errors
export default {};

// export const Idle: Story = { args: { isIndexing: false } };
// export const Indexing: Story = { args: { isIndexing: true, progressPct: 0.42, etaSeconds: 120, paused: false } };
