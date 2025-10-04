import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsModal } from '../AnalyticsModal';

// Mock the shadcn/ui components
vi.mock('../dialog', () => ({
	Dialog: ({ children, open, onOpenChange }: any) => (
		open ? <div data-testid="dialog" onClick={() => onOpenChange(false)}>{children}</div> : null
	),
	DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
	DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
	DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}));

vi.mock('../button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>{children}</button>
	),
}));

const mockInsights = {
	overview: {
		totalCollections: 5,
		totalPhotos: 150,
		avgPhotosPerCollection: 30,
		totalEstimatedStorage: 375,
	},
	collections: {
		largest: { name: 'Vacation', count: 50, estimatedSize: 125 },
		smallest: { name: 'Work', count: 10, estimatedSize: 25 },
		sortedBySize: [
			{ name: 'Vacation', count: 50, estimatedSize: 125 },
			{ name: 'Family', count: 40, estimatedSize: 100 },
			{ name: 'Nature', count: 30, estimatedSize: 75 },
		],
	},
	themes: {
		blue: 2,
		green: 2,
		purple: 1,
	},
	recentActivity: ['Vacation', 'Family', 'Nature'],
};

const mockCollections = {
	Vacation: ['photo1.jpg', 'photo2.jpg'],
	Family: ['photo3.jpg'],
	Nature: ['photo4.jpg', 'photo5.jpg'],
};

describe('AnalyticsModal', () => {
	const mockOnClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders analytics title when open', () => {
		render(
			<AnalyticsModal
				isOpen={true}
				onClose={mockOnClose}
				insights={mockInsights}
				collections={mockCollections}
			/>
		);

		expect(screen.getByTestId('dialog-title')).toHaveTextContent('Collection Insights & Analytics');
	});

	it('displays overview statistics correctly', () => {
		render(
			<AnalyticsModal
				isOpen={true}
				onClose={mockOnClose}
				insights={mockInsights}
				collections={mockCollections}
			/>
		);

		expect(screen.getByText('5')).toBeInTheDocument(); // Total collections
		expect(screen.getByText('150')).toBeInTheDocument(); // Total photos
		expect(screen.getByText('30')).toBeInTheDocument(); // Average per collection
		expect(screen.getByText('375 MB')).toBeInTheDocument(); // Storage
	});

	it('shows largest and smallest collection analysis', () => {
		render(
			<AnalyticsModal
				isOpen={true}
				onClose={mockOnClose}
				insights={mockInsights}
				collections={mockCollections}
			/>
		);

		expect(screen.getByText('Vacation')).toBeInTheDocument();
		expect(screen.getByText('50 photos')).toBeInTheDocument();
		expect(screen.getByText('Work')).toBeInTheDocument();
		expect(screen.getByText('10 photos')).toBeInTheDocument();
	});

	it('displays top collections by size', () => {
		render(
			<AnalyticsModal
				isOpen={true}
				onClose={mockOnClose}
				insights={mockInsights}
				collections={mockCollections}
			/>
		);

		expect(screen.getByText('#1')).toBeInTheDocument();
		expect(screen.getByText('#2')).toBeInTheDocument();
		expect(screen.getByText('#3')).toBeInTheDocument();
	});

	it('shows theme distribution', () => {
		render(
			<AnalyticsModal
				isOpen={true}
				onClose={mockOnClose}
				insights={mockInsights}
				collections={mockCollections}
			/>
		);

		expect(screen.getByText('Blue')).toBeInTheDocument();
		expect(screen.getByText('2 collections')).toBeInTheDocument();
		expect(screen.getByText('Green')).toBeInTheDocument();
		expect(screen.getByText('Purple')).toBeInTheDocument();
		expect(screen.getByText('1 collection')).toBeInTheDocument();
	});

	it('displays recent activity', () => {
		render(
			<AnalyticsModal
				isOpen={true}
				onClose={mockOnClose}
				insights={mockInsights}
				collections={mockCollections}
			/>
		);

		expect(screen.getByText('Recent')).toBeInTheDocument();
	});

	it('shows empty state when no collections exist', () => {
		const emptyInsights = {
			...mockInsights,
			overview: { ...mockInsights.overview, totalCollections: 0 },
		};

		render(
			<AnalyticsModal
				isOpen={true}
				onClose={mockOnClose}
				insights={emptyInsights}
				collections={{}}
			/>
		);

		expect(screen.getByText('No Collections Yet')).toBeInTheDocument();
		expect(screen.getByText('Create your first collection to see insights and analytics.')).toBeInTheDocument();
	});

	it('does not render when closed', () => {
		render(
			<AnalyticsModal
				isOpen={false}
				onClose={mockOnClose}
				insights={mockInsights}
				collections={mockCollections}
			/>
		);

		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});
});