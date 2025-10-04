import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollectionContextMenu } from '../CollectionContextMenu';

const mockContextMenu = {
	x: 100,
	y: 150,
	collectionName: 'Test Collection',
};

const mockCollections = {
	'Test Collection': ['photo1.jpg', 'photo2.jpg'],
	'Empty Collection': [],
};

describe('CollectionContextMenu', () => {
	const mockOnAction = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not render when contextMenu is null', () => {
		render(
			<CollectionContextMenu
				contextMenu={null}
				collections={mockCollections}
				onAction={mockOnAction}
			/>
		);

		expect(screen.queryByText('Test Collection')).not.toBeInTheDocument();
	});

	it('renders collection name in header', () => {
		render(
			<CollectionContextMenu
				contextMenu={mockContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
			/>
		);

		expect(screen.getByText('Test Collection')).toBeInTheDocument();
	});

	it('positions menu correctly', () => {
		render(
			<CollectionContextMenu
				contextMenu={mockContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
			/>
		);

		const menu = screen.getByText('Test Collection').closest('div');
		expect(menu).toHaveStyle('left: 100px');
		expect(menu).toHaveStyle('top: 150px');
	});

	it('calls onAction when open is clicked', () => {
		render(
			<CollectionContextMenu
				contextMenu={mockContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
			/>
		);

		fireEvent.click(screen.getByText('Open Collection'));
		expect(mockOnAction).toHaveBeenCalledWith('open', 'Test Collection');
	});

	it('disables share and export for empty collections', () => {
		const emptyContextMenu = {
			...mockContextMenu,
			collectionName: 'Empty Collection',
		};

		render(
			<CollectionContextMenu
				contextMenu={emptyContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
			/>
		);

		const shareButton = screen.getByText('Share').closest('button');
		const exportButton = screen.getByText('Export').closest('button');

		expect(shareButton).toBeDisabled();
		expect(exportButton).toBeDisabled();
	});

	it('enables share and export for collections with photos', () => {
		render(
			<CollectionContextMenu
				contextMenu={mockContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
			/>
		);

		const shareButton = screen.getByText('Share').closest('button');
		const exportButton = screen.getByText('Export').closest('button');

		expect(shareButton).not.toBeDisabled();
		expect(exportButton).not.toBeDisabled();
	});

	it('shows delete button when showDelete is true', () => {
		render(
			<CollectionContextMenu
				contextMenu={mockContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
				showDelete={true}
			/>
		);

		expect(screen.getByText('Delete')).toBeInTheDocument();
	});

	it('does not show delete button when showDelete is false', () => {
		render(
			<CollectionContextMenu
				contextMenu={mockContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
				showDelete={false}
			/>
		);

		expect(screen.queryByText('Delete')).not.toBeInTheDocument();
	});

	it('calls onAction for all menu items', () => {
		render(
			<CollectionContextMenu
				contextMenu={mockContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
				showDelete={true}
			/>
		);

		fireEvent.click(screen.getByText('Share'));
		expect(mockOnAction).toHaveBeenCalledWith('share', 'Test Collection');

		fireEvent.click(screen.getByText('Export'));
		expect(mockOnAction).toHaveBeenCalledWith('export', 'Test Collection');

		fireEvent.click(screen.getByText('Change Theme'));
		expect(mockOnAction).toHaveBeenCalledWith('theme', 'Test Collection');

		fireEvent.click(screen.getByText('Change Cover'));
		expect(mockOnAction).toHaveBeenCalledWith('cover', 'Test Collection');

		fireEvent.click(screen.getByText('Rename'));
		expect(mockOnAction).toHaveBeenCalledWith('rename', 'Test Collection');

		fireEvent.click(screen.getByText('Duplicate'));
		expect(mockOnAction).toHaveBeenCalledWith('duplicate', 'Test Collection');

		fireEvent.click(screen.getByText('Archive'));
		expect(mockOnAction).toHaveBeenCalledWith('archive', 'Test Collection');

		fireEvent.click(screen.getByText('Delete'));
		expect(mockOnAction).toHaveBeenCalledWith('delete', 'Test Collection');
	});

	it('prevents overflow by adjusting position near screen edges', () => {
		// Mock window dimensions
		Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
		Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

		const edgeContextMenu = {
			x: 1150, // Near right edge
			y: 750,  // Near bottom edge
			collectionName: 'Test Collection',
		};

		render(
			<CollectionContextMenu
				contextMenu={edgeContextMenu}
				collections={mockCollections}
				onAction={mockOnAction}
			/>
		);

		const menu = screen.getByText('Test Collection').closest('div');
		expect(menu).toHaveStyle('left: 1000px'); // Adjusted from 1150
		expect(menu).toHaveStyle('top: 400px');   // Adjusted from 750
	});
});