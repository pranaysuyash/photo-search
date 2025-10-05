import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollectionCard } from '../CollectionCard';

// Mock the shadcn/ui components
vi.mock('../card', () => ({
	Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
	CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
}));

vi.mock('../button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button type="button" onClick={onClick} {...props}>{children}</button>
	),
}));

vi.mock('../dropdown-menu', () => ({
	DropdownMenu: ({ children }: any) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuItem: ({ children, onClick }: any) => (
		<button type="button" onClick={onClick}>{children}</button>
	),
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../tooltip', () => ({
	Tooltip: ({ children }: any) => <div>{children}</div>,
	TooltipContent: ({ children }: any) => <div>{children}</div>,
	TooltipProvider: ({ children }: any) => <div>{children}</div>,
	TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

const mockProps = {
	name: 'Test Collection',
	photos: ['photo1.jpg', 'photo2.jpg'],
	theme: { colors: 'from-blue-400 to-blue-600', border: 'border-blue-300' },
	dir: '/test',
	engine: 'test',
	onOpen: vi.fn(),
	onShare: vi.fn(),
	onExport: vi.fn(),
	onSetCover: vi.fn(),
	onChangeTheme: vi.fn(),
	onDragStart: vi.fn(),
	onDragOver: vi.fn(),
	onDragEnter: vi.fn(),
	onDragLeave: vi.fn(),
	onDrop: vi.fn(),
	onContextMenu: vi.fn(),
	onRecordAction: vi.fn(),
	getCollectionCover: vi.fn(() => 'photo1.jpg'),
	thumbUrl: vi.fn((dir, engine, path, size) => `${dir}/${path}?size=${size}`),
	collectionThemes: {},
	loadedImages: new Set(),
	setLoadedImages: vi.fn(),
};

describe('CollectionCard', () => {
	it('renders collection name and photo count', () => {
		render(<CollectionCard {...mockProps} />);

		expect(screen.getByText('Test Collection')).toBeInTheDocument();
		expect(screen.getByText('2 photos')).toBeInTheDocument();
	});

	it('shows empty state for collections without photos', () => {
		render(<CollectionCard {...mockProps} photos={[]} />);

		expect(screen.getByText('Empty collection')).toBeInTheDocument();
		expect(screen.getByText('0 photos')).toBeInTheDocument();
	});

	it('calls onOpen when view collection button is clicked', () => {
		render(<CollectionCard {...mockProps} />);

		fireEvent.click(screen.getByText('View Collection'));
		expect(mockProps.onOpen).toHaveBeenCalledWith('Test Collection');
	});

	it('shows bulk selection checkbox when in bulk mode', () => {
		render(<CollectionCard {...mockProps} bulkMode={true} onToggleSelection={vi.fn()} />);

		const checkbox = screen.getByRole('button');
		expect(checkbox).toBeInTheDocument();
	});

	it('applies focus styling when focused', () => {
		render(<CollectionCard {...mockProps} isFocused={true} />);

		const card = screen.getByTestId('card');
		expect(card).toHaveClass('ring-4', 'ring-blue-400');
	});

	it('applies drop target styling when is drop target', () => {
		render(<CollectionCard {...mockProps} isDropTarget={true} />);

		const card = screen.getByTestId('card');
		expect(card).toHaveClass('border-blue-500', 'bg-blue-50');
	});

	it('shows dragging state when isDragging is true', () => {
		render(<CollectionCard {...mockProps} isDragging={true} />);

		const card = screen.getByTestId('card');
		expect(card).toHaveClass('opacity-50', 'scale-95');
	});

	it('handles keyboard navigation', () => {
		const onToggleSelection = vi.fn();
		render(
			<CollectionCard
				{...mockProps}
				bulkMode={true}
				onToggleSelection={onToggleSelection}
			/>
		);

		const card = screen.getByTestId('card');
		fireEvent.keyDown(card, { key: 'Enter' });
		expect(onToggleSelection).toHaveBeenCalledWith('Test Collection');
	});

	it('calls onClick when provided', () => {
		const onClick = vi.fn();
		render(<CollectionCard {...mockProps} onClick={onClick} />);

		const card = screen.getByTestId('card');
		fireEvent.click(card);
		expect(onClick).toHaveBeenCalled();
	});
});