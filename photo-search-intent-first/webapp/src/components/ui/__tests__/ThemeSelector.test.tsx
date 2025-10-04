import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeSelector } from '../ThemeSelector';

// Mock the shadcn/ui components
vi.mock('../dialog', () => ({
	Dialog: ({ children, open, onOpenChange }: any) => (
		open ? <div data-testid="dialog" onClick={() => onOpenChange(false)}>{children}</div> : null
	),
	DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
	DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
	DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}));

const mockThemes = {
	blue: {
		name: 'Ocean Blue',
		colors: 'from-blue-400 to-blue-600',
		accent: 'text-blue-600',
	},
	green: {
		name: 'Forest Green',
		colors: 'from-green-400 to-green-600',
		accent: 'text-green-600',
	},
	purple: {
		name: 'Royal Purple',
		colors: 'from-purple-400 to-purple-600',
		accent: 'text-purple-600',
	},
};

describe('ThemeSelector', () => {
	const mockOnClose = vi.fn();
	const mockOnSelectTheme = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not render when collectionName is null', () => {
		render(
			<ThemeSelector
				isOpen={true}
				collectionName={null}
				currentTheme="blue"
				themes={mockThemes}
				onClose={mockOnClose}
				onSelectTheme={mockOnSelectTheme}
			/>
		);

		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders theme selector title when open', () => {
		render(
			<ThemeSelector
				isOpen={true}
				collectionName="Test Collection"
				currentTheme="blue"
				themes={mockThemes}
				onClose={mockOnClose}
				onSelectTheme={mockOnSelectTheme}
			/>
		);

		expect(screen.getByTestId('dialog-title')).toHaveTextContent('Choose Theme');
	});

	it('displays all available themes', () => {
		render(
			<ThemeSelector
				isOpen={true}
				collectionName="Test Collection"
				currentTheme="blue"
				themes={mockThemes}
				onClose={mockOnClose}
				onSelectTheme={mockOnSelectTheme}
			/>
		);

		expect(screen.getByText('Ocean Blue')).toBeInTheDocument();
		expect(screen.getByText('Forest Green')).toBeInTheDocument();
		expect(screen.getByText('Royal Purple')).toBeInTheDocument();
	});

	it('highlights the current theme', () => {
		render(
			<ThemeSelector
				isOpen={true}
				collectionName="Test Collection"
				currentTheme="blue"
				themes={mockThemes}
				onClose={mockOnClose}
				onSelectTheme={mockOnSelectTheme}
			/>
		);

		const blueThemeButton = screen.getByText('Ocean Blue').closest('button');
		expect(blueThemeButton).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-200');

		const greenThemeButton = screen.getByText('Forest Green').closest('button');
		expect(greenThemeButton).not.toHaveClass('border-blue-500');
	});

	it('calls onSelectTheme and onClose when theme is selected', () => {
		render(
			<ThemeSelector
				isOpen={true}
				collectionName="Test Collection"
				currentTheme="blue"
				themes={mockThemes}
				onClose={mockOnClose}
				onSelectTheme={mockOnSelectTheme}
			/>
		);

		fireEvent.click(screen.getByText('Forest Green'));

		expect(mockOnSelectTheme).toHaveBeenCalledWith('Test Collection', 'green');
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('applies correct theme colors to preview', () => {
		render(
			<ThemeSelector
				isOpen={true}
				collectionName="Test Collection"
				currentTheme="blue"
				themes={mockThemes}
				onClose={mockOnClose}
				onSelectTheme={mockOnSelectTheme}
			/>
		);

		const bluePreview = screen.getByText('Ocean Blue').previousElementSibling;
		expect(bluePreview).toHaveClass('from-blue-400', 'to-blue-600');

		const greenPreview = screen.getByText('Forest Green').previousElementSibling;
		expect(greenPreview).toHaveClass('from-green-400', 'to-green-600');
	});

	it('applies correct accent colors to theme names', () => {
		render(
			<ThemeSelector
				isOpen={true}
				collectionName="Test Collection"
				currentTheme="blue"
				themes={mockThemes}
				onClose={mockOnClose}
				onSelectTheme={mockOnSelectTheme}
			/>
		);

		const blueText = screen.getByText('Ocean Blue');
		expect(blueText).toHaveClass('text-blue-600');

		const greenText = screen.getByText('Forest Green');
		expect(greenText).toHaveClass('text-green-600');

		const purpleText = screen.getByText('Royal Purple');
		expect(purpleText).toHaveClass('text-purple-600');
	});

	it('does not render when closed', () => {
		render(
			<ThemeSelector
				isOpen={false}
				collectionName="Test Collection"
				currentTheme="blue"
				themes={mockThemes}
				onClose={mockOnClose}
				onSelectTheme={mockOnSelectTheme}
			/>
		);

		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});
});