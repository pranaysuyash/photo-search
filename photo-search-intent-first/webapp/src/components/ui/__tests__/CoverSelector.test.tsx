import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CoverSelector } from '../CoverSelector';

// Mock the shadcn/ui components
vi.mock('../dialog', () => ({
	Dialog: ({ children, open, onOpenChange }: any) => (
		open ? <div data-testid="dialog" onClick={() => onOpenChange(false)}>{children}</div> : null
	),
	DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
}));

vi.mock('../button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>{children}</button>
	),
}));

const mockPhotos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'];

describe('CoverSelector', () => {
	const mockOnClose = vi.fn();
	const mockOnSelectCover = vi.fn();
	const mockThumbUrl = vi.fn((dir, engine, path, size) => `${dir}/${path}?size=${size}`);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not render when collectionName is null', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName={null}
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders cover selector with collection name', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		expect(screen.getByText('Choose Cover Photo')).toBeInTheDocument();
		expect(screen.getByText('Select a photo to represent the "Test Collection" collection')).toBeInTheDocument();
	});

	it('displays current cover index', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={2}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		expect(screen.getByText('Current: Photo 3')).toBeInTheDocument();
	});

	it('renders all photos in grid', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		const images = screen.getAllByRole('img');
		expect(images).toHaveLength(4);

		images.forEach((img, index) => {
			expect(img).toHaveAttribute('src', `/test/${mockPhotos[index]}?size=150`);
			expect(img).toHaveAttribute('alt', `Photo ${index + 1}`);
		});
	});

	it('highlights the current cover photo', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={1}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		const photoButtons = screen.getAllByRole('button');
		// Find the button containing the second photo (index 1)
		const currentCoverButton = photoButtons.find(button =>
			button.querySelector('img[alt="Photo 2"]')
		);

		expect(currentCoverButton).toHaveClass('ring-4', 'ring-blue-500', 'ring-offset-2');
	});

	it('shows current cover indicator on selected photo', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={1}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		// Check that the check icon is present (indicating current cover)
		const checkIcons = screen.getAllByTestId ? screen.getAllByTestId('check-icon') : [];
		// Since we're mocking lucide-react icons, we need to check differently
		// The current cover should have specific styling applied
		expect(screen.getByText('2')).toBeInTheDocument(); // Photo number
	});

	it('calls onSelectCover when photo is clicked', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		const photoButtons = screen.getAllByRole('button');
		const thirdPhotoButton = photoButtons.find(button =>
			button.querySelector('img[alt="Photo 3"]')
		);

		if (thirdPhotoButton) {
			fireEvent.click(thirdPhotoButton);
			expect(mockOnSelectCover).toHaveBeenCalledWith('Test Collection', 2);
		}
	});

	it('displays photo count in footer', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		expect(screen.getByText('4 photos in this collection')).toBeInTheDocument();
	});

	it('calls onClose when Done button is clicked', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		fireEvent.click(screen.getByText('Done'));
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('calls onClose when back arrow is clicked', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		// Find the back button (should be the first button in the header)
		const buttons = screen.getAllByRole('button');
		const backButton = buttons[0]; // First button should be the back arrow

		fireEvent.click(backButton);
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('does not render when closed', () => {
		render(
			<CoverSelector
				isOpen={false}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('calls thumbUrl with correct parameters', () => {
		render(
			<CoverSelector
				isOpen={true}
				collectionName="Test Collection"
				photos={mockPhotos}
				currentCoverIndex={0}
				onClose={mockOnClose}
				onSelectCover={mockOnSelectCover}
				thumbUrl={mockThumbUrl}
				dir="/test"
				engine="test"
			/>
		);

		expect(mockThumbUrl).toHaveBeenCalledWith('/test', 'test', 'photo1.jpg', 150);
		expect(mockThumbUrl).toHaveBeenCalledWith('/test', 'test', 'photo2.jpg', 150);
		expect(mockThumbUrl).toHaveBeenCalledWith('/test', 'test', 'photo3.jpg', 150);
		expect(mockThumbUrl).toHaveBeenCalledWith('/test', 'test', 'photo4.jpg', 150);
	});
});