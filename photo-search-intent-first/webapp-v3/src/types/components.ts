/**
 * Component prop type definitions
 * Based on the design document specifications
 */

import { ReactNode, MouseEvent, KeyboardEvent } from 'react';
import { Photo, Collection, Tag, Person, Place, Trip } from './photo';
import { SearchRequest, SearchResponse } from './search';

// Base Component Props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  'data-testid'?: string;
}

// Photo Grid Component Props
export interface PhotoGridProps extends BaseComponentProps {
  photos: Photo[];
  selectedPhotos?: Set<string>;
  onPhotoSelect?: (photoId: string) => void;
  onPhotoDoubleClick?: (photo: Photo) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  viewMode?: 'grid' | 'list' | 'timeline';
  gridSize?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  enableSelection?: boolean;
  enableDragDrop?: boolean;
  onDrop?: (photoIds: string[], targetId?: string) => void;
}

// Photo Item Component Props
export interface PhotoItemProps extends BaseComponentProps {
  photo: Photo;
  isSelected?: boolean;
  onSelect?: (photoId: string) => void;
  onDoubleClick?: (photo: Photo) => void;
  onContextMenu?: (photo: Photo, event: MouseEvent) => void;
  size?: 'small' | 'medium' | 'large';
  showMetadata?: boolean;
  showOverlay?: boolean;
  isDragging?: boolean;
  onDragStart?: (photo: Photo) => void;
  onDragEnd?: () => void;
}

// Search Bar Component Props
export interface SearchBarProps extends BaseComponentProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  suggestions?: string[];
  isLoading?: boolean;
  showFilters?: boolean;
  onFiltersToggle?: () => void;
  autoFocus?: boolean;
}

// Search Filters Component Props
export interface SearchFiltersProps extends BaseComponentProps {
  filters: SearchRequest['filters'];
  onFiltersChange: (filters: SearchRequest['filters']) => void;
  onReset?: () => void;
  availableTags?: Tag[];
  availablePeople?: Person[];
  availableCollections?: Collection[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Collection List Component Props
export interface CollectionListProps extends BaseComponentProps {
  collections: Collection[];
  selectedCollection?: Collection | null;
  onCollectionSelect?: (collection: Collection) => void;
  onCollectionCreate?: (name: string, description?: string) => void;
  onCollectionUpdate?: (collectionId: string, updates: Partial<Collection>) => void;
  onCollectionDelete?: (collectionId: string) => void;
  isLoading?: boolean;
  enableEditing?: boolean;
}

// Collection Item Component Props
export interface CollectionItemProps extends BaseComponentProps {
  collection: Collection;
  isSelected?: boolean;
  onSelect?: (collection: Collection) => void;
  onEdit?: (collection: Collection) => void;
  onDelete?: (collectionId: string) => void;
  showPhotoCount?: boolean;
  showCover?: boolean;
}

// Tag Cloud Component Props
export interface TagCloudProps extends BaseComponentProps {
  tags: Tag[];
  selectedTags?: string[];
  onTagSelect?: (tagId: string) => void;
  onTagCreate?: (name: string, color?: string) => void;
  onTagUpdate?: (tagId: string, updates: Partial<Tag>) => void;
  onTagDelete?: (tagId: string) => void;
  maxTags?: number;
  sortBy?: 'name' | 'count' | 'recent';
  enableEditing?: boolean;
}

// People Grid Component Props
export interface PeopleGridProps extends BaseComponentProps {
  people: Person[];
  selectedPerson?: Person | null;
  onPersonSelect?: (person: Person) => void;
  onPersonUpdate?: (personId: string, updates: Partial<Person>) => void;
  onPersonMerge?: (sourceId: string, targetId: string) => void;
  onPersonDelete?: (personId: string) => void;
  isLoading?: boolean;
  enableEditing?: boolean;
}

// Places Map Component Props
export interface PlacesMapProps extends BaseComponentProps {
  places: Place[];
  photos?: Photo[];
  selectedPlace?: Place | null;
  onPlaceSelect?: (place: Place) => void;
  onPhotoSelect?: (photo: Photo) => void;
  center?: [number, number];
  zoom?: number;
  onMapChange?: (center: [number, number], zoom: number) => void;
  showClusters?: boolean;
  showHeatmap?: boolean;
}

// Timeline Component Props
export interface TimelineProps extends BaseComponentProps {
  photos: Photo[];
  groupBy?: 'day' | 'month' | 'year';
  onPhotoSelect?: (photo: Photo) => void;
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void;
  selectedDateRange?: [Date, Date];
  isLoading?: boolean;
}

// Modal Component Props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

// Photo Viewer Component Props
export interface PhotoViewerProps extends BaseComponentProps {
  photo: Photo;
  photos?: Photo[];
  currentIndex?: number;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onPhotoChange?: (photo: Photo, index: number) => void;
  showNavigation?: boolean;
  showMetadata?: boolean;
  showActions?: boolean;
  onFavoriteToggle?: (photoId: string) => void;
  onTagAdd?: (photoId: string, tagId: string) => void;
  onTagRemove?: (photoId: string, tagId: string) => void;
}

// Sidebar Component Props
export interface SidebarProps extends BaseComponentProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  collections?: Collection[];
  tags?: Tag[];
  people?: Person[];
  onItemSelect?: (type: string, item: any) => void;
}

// Top Bar Component Props
export interface TopBarProps extends BaseComponentProps {
  title?: string;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearch?: (query: string) => void;
  actions?: TopBarAction[];
  breadcrumbs?: Breadcrumb[];
}

// Top Bar Action Interface
export interface TopBarAction {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
}

// Breadcrumb Interface
export interface Breadcrumb {
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

// Loading Component Props
export interface LoadingProps extends BaseComponentProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'skeleton' | 'progress';
  message?: string;
  progress?: number;
}

// Error Boundary Component Props
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: any[];
}

// Notification Component Props
export interface NotificationProps extends BaseComponentProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
  actions?: NotificationAction[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Notification Action Interface
export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

// Form Component Props
export interface FormProps extends BaseComponentProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  validationSchema?: any;
  initialValues?: any;
}

// Input Component Props
export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}

// Button Component Props
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'small' | 'medium' | 'large';
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

// Dropdown Component Props
export interface DropdownProps extends BaseComponentProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onItemSelect?: (item: DropdownItem) => void;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  disabled?: boolean;
}

// Dropdown Item Interface
export interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  destructive?: boolean;
}

// Virtualized List Component Props
export interface VirtualizedListProps extends BaseComponentProps {
  items: any[];
  itemHeight: number;
  renderItem: (item: any, index: number) => ReactNode;
  onScroll?: (scrollTop: number) => void;
  overscan?: number;
  height?: number;
  width?: number;
}