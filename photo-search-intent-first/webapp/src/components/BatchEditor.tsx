/**
 * Batch Editor Component
 * Apply edits and filters to multiple photos at once
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
	Edit3,
	Wand2,
	Download,
	Upload,
	Play,
	Pause,
	SkipForward,
	Check,
	X,
	ZoomIn,
	Eye,
	EyeOff,
	Settings,
	FileImage,
	Clock
} from 'lucide-react';
import { Button } from './ui/shadcn/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/shadcn/Card';
import { Badge } from './ui/shadcn/Badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/shadcn/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/shadcn/Select';
import { Slider } from './ui/shadcn/Slider';
import { useToast } from '@/hooks/use-toast';
import VisualAnalysisService, {
	CreativeFilter,
	EditOperation,
	VisualAnalysisResult
} from '../services/VisualAnalysisService';

interface BatchEditorProps {
	selectedImages: string[];
	onImagesUpdate?: (updatedImages: string[]) => void;
	onPhotoView?: (photo: { path: string }) => void;
}

export interface BatchEditOperation {
	type: 'filter' | 'adjustment' | 'rename' | 'tag' | 'metadata';
	name: string;
	filter?: CreativeFilter;
	adjustments?: {
		brightness?: number;
		contrast?: number;
		saturation?: number;
		hue?: number;
		sharpness?: number;
	};
	renamePattern?: string;
	tags?: string[];
	metadata?: Record<string, string>;
}

export interface BatchProcessingState {
	processing: boolean;
	currentIndex: number;
	totalImages: number;
	currentImage?: string;
	completedImages: string[];
	failedImages: Array<{ path: string; error: string }>;
	processedImages: Array<{ original: string; processed: string }>;
}

export function BatchEditor({
	selectedImages,
	onImagesUpdate,
	onPhotoView
}: BatchEditorProps) {
	const [images, setImages] = useState<string[]>(selectedImages);
	const [selectedImagesForBatch, setSelectedImagesForBatch] = useState<Set<string>>(new Set(selectedImages));
	const [batchOperations, setBatchOperations] = useState<BatchEditOperation[]>([]);
	const [currentOperation, setCurrentOperation] = useState<BatchEditOperation | null>(null);
	const [processingState, setProcessingState] = useState<BatchProcessingState>({
		processing: false,
		currentIndex: 0,
		totalImages: 0,
		completedImages: [],
		failedImages: [],
		processedImages: []
	});
	const [previewMode, setPreviewMode] = useState(true);
	const [showAdvanced, setShowAdvanced] = useState(false);

	const { toast } = useToast();
	const analysisService = VisualAnalysisService.getInstance();
	const availableFilters = analysisService.getCreativeFilters();

	useEffect(() => {
		setImages(selectedImages);
		setSelectedImagesForBatch(new Set(selectedImages));
	}, [selectedImages]);

	const toggleImageSelection = useCallback((imagePath: string) => {
		const newSelected = new Set(selectedImagesForBatch);
		if (newSelected.has(imagePath)) {
			newSelected.delete(imagePath);
		} else {
			newSelected.add(imagePath);
		}
		setSelectedImagesForBatch(newSelected);
	}, [selectedImagesForBatch]);

	const selectAllImages = useCallback(() => {
		setSelectedImagesForBatch(new Set(images));
	}, [images]);

	const deselectAllImages = useCallback(() => {
		setSelectedImagesForBatch(new Set());
	}, []);

	const addBatchOperation = useCallback((operation: BatchEditOperation) => {
		setBatchOperations(prev => [...prev, operation]);
	}, []);

	const removeBatchOperation = useCallback((index: number) => {
		setBatchOperations(prev => prev.filter((_, i) => i !== index));
	}, []);

	const addFilterOperation = useCallback((filter: CreativeFilter) => {
		const operation: BatchEditOperation = {
			type: 'filter',
			name: `Apply ${filter.name} Filter`,
			filter
		};
		addBatchOperation(operation);
	}, [addBatchOperation]);

	const addAdjustmentOperation = useCallback((adjustments: any) => {
		const operation: BatchEditOperation = {
			type: 'adjustment',
			name: 'Apply Adjustments',
			adjustments
		};
		addBatchOperation(operation);
	}, [addBatchOperation]);

	const addRenameOperation = useCallback((pattern: string) => {
		const operation: BatchEditOperation = {
			type: 'rename',
			name: 'Batch Rename',
			renamePattern: pattern
		};
		addBatchOperation(operation);
	}, [addBatchOperation]);

	const processBatch = async () => {
		if (selectedImagesForBatch.size === 0 || batchOperations.length === 0) {
			toast({
				title: "Cannot Process",
				description: "Please select images and add operations.",
				variant: "destructive"
			});
			return;
		}

		setProcessingState({
			processing: true,
			currentIndex: 0,
			totalImages: selectedImagesForBatch.size,
			completedImages: [],
			failedImages: [],
			processedImages: []
		});

		const imagesToProcess = Array.from(selectedImagesForBatch);
		const processed: Array<{ original: string; processed: string }> = [];
		const failed: Array<{ path: string; error: string }> = [];

		for (let i = 0; i < imagesToProcess.length; i++) {
			const imagePath = imagesToProcess[i];
			setProcessingState(prev => ({
				...prev,
				currentIndex: i,
				currentImage: imagePath
			}));

			try {
				// Process each operation in sequence
				let currentImagePath = imagePath;

				for (const operation of batchOperations) {
					switch (operation.type) {
						case 'filter':
						case 'adjustment':
							const edits: EditOperation[] = [{
								type: operation.type === 'filter' ? 'filter' : 'adjustment',
								filter: operation.filter,
								adjustments: operation.adjustments
							}];
							currentImagePath = await analysisService.applyCreativeEdits(currentImagePath, edits);
							break;

						case 'rename':
							// Simulate rename operation
							const newPath = applyRenamePattern(currentImagePath, operation.renamePattern!, i);
							// In production, this would actually rename the file
							break;

						case 'tag':
							// Simulate tagging operation
							console.log(`Adding tags ${operation.tags?.join(', ')} to ${currentImagePath}`);
							break;

						case 'metadata':
							// Simulate metadata update
							console.log(`Updating metadata for ${currentImagePath}`);
							break;
					}
				}

				processed.push({
					original: imagePath,
					processed: currentImagePath
				});

				setProcessingState(prev => ({
					...prev,
					completedImages: [...prev.completedImages, imagePath],
					processedImages: processed
				}));

			} catch (error) {
				failed.push({
					path: imagePath,
					error: error instanceof Error ? error.message : 'Unknown error'
				});

				setProcessingState(prev => ({
					...prev,
					failedImages: [...prev.failedImages, failed[failed.length - 1]]
				}));
			}

			// Small delay between images for better UX
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		setProcessingState(prev => ({
			...prev,
			processing: false,
			currentIndex: imagesToProcess.length
		}));

		toast({
			title: "Batch Processing Complete",
			description: `Successfully processed ${processed.length} images. ${failed.length} failed.`,
		});

		if (onImagesUpdate) {
			const updatedImages = processed.map(p => p.processed);
			onImagesUpdate(updatedImages);
		}
	};

	const applyRenamePattern = (originalPath: string, pattern: string, index: number): string => {
		// Simple rename pattern application
		const fileName = originalPath.split('/').pop() || '';
		const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
		const extension = fileName.substring(fileName.lastIndexOf('.'));

		return pattern
			.replace('{name}', nameWithoutExt)
			.replace('{index}', (index + 1).toString())
			.replace('{date}', new Date().toISOString().split('T')[0]) + extension;
	};

	const stopBatchProcessing = () => {
		setProcessingState(prev => ({
			...prev,
			processing: false
		}));
	};

	const clearBatchOperations = () => {
		setBatchOperations([]);
	};

	const downloadBatchResults = () => {
		const results = {
			processed: processingState.processedImages,
			failed: processingState.failedImages,
			operations: batchOperations,
			timestamp: new Date().toISOString()
		};

		const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `batch_results_${Date.now()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const getOperationIcon = (operation: BatchEditOperation) => {
		switch (operation.type) {
			case 'filter': return <Wand2 className="w-4 h-4" />;
			case 'adjustment': return <Settings className="w-4 h-4" />;
			case 'rename': return <Edit3 className="w-4 h-4" />;
			case 'tag': return <FileImage className="w-4 h-4" />;
			case 'metadata': return <FileImage className="w-4 h-4" />;
			default: return <Edit3 className="w-4 h-4" />;
		}
	};

	return (
		<div className="batch-editor">
			{/* Header */}
			<div className="batch-header">
				<div className="batch-title">
					<h3 className="text-lg font-semibold">Batch Editor</h3>
					<p className="text-sm text-muted-foreground">
						Apply edits and operations to multiple photos
					</p>
				</div>
				<div className="batch-controls">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPreviewMode(!previewMode)}
					>
						{previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
						{previewMode ? 'Hide Preview' : 'Show Preview'}
					</Button>
					{processingState.processing ? (
						<Button variant="destructive" size="sm" onClick={stopBatchProcessing}>
							<Pause className="w-4 h-4 mr-2" />
							Stop
						</Button>
					) : (
						<Button
							onClick={processBatch}
							disabled={selectedImagesForBatch.size === 0 || batchOperations.length === 0}
						>
							<Play className="w-4 h-4 mr-2" />
							Start Batch
						</Button>
					)}
				</div>
			</div>

			<div className="batch-content">
				{/* Image Selection */}
				<Card>
					<CardHeader>
						<div className="flex justify-between items-center">
							<CardTitle className="text-base">
								Selected Images ({selectedImagesForBatch.size}/{images.length})
							</CardTitle>
							<div className="selection-controls">
								<Button variant="outline" size="sm" onClick={selectAllImages}>
									Select All
								</Button>
								<Button variant="outline" size="sm" onClick={deselectAllImages}>
									Deselect All
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{images.length > 0 ? (
							<div className="image-grid">
								{images.map((image, index) => (
									<div
										key={index}
										className={`image-item ${selectedImagesForBatch.has(image) ? 'selected' : ''}`}
										onClick={() => toggleImageSelection(image)}
									>
										<div className="image-container">
											<img
												src={image}
												alt={`Image ${index + 1}`}
												className="w-full h-24 object-cover rounded"
											/>
											<div className="selection-overlay">
												<Checkbox
													checked={selectedImagesForBatch.has(image)}
													onChange={() => {}}
												/>
											</div>
										</div>
										<p className="image-name text-xs text-muted-foreground truncate">
											{image.split('/').pop()}
										</p>
									</div>
								))}
							</div>
						) : (
							<div className="no-images">
								<FileImage className="w-12 h-12 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									No images selected for batch processing
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Batch Operations */}
				<Card>
					<CardHeader>
						<div className="flex justify-between items-center">
							<CardTitle className="text-base">
								Batch Operations ({batchOperations.length})
							</CardTitle>
							{batchOperations.length > 0 && (
								<Button variant="outline" size="sm" onClick={clearBatchOperations}>
									Clear All
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="filters" className="w-full">
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="filters">Filters</TabsTrigger>
								<TabsTrigger value="adjust">Adjust</TabsTrigger>
								<TabsTrigger value="organize">Organize</TabsTrigger>
								<TabsTrigger value="queue">Queue</TabsTrigger>
							</TabsList>

							<TabsContent value="filters" className="space-y-4">
								<div className="filter-grid">
									{availableFilters.map((filter) => (
										<Button
											key={filter.id}
											variant="outline"
											className="filter-option"
											onClick={() => addFilterOperation(filter)}
										>
											<div className="filter-info">
												<span>{filter.name}</span>
												<Badge variant="outline" className="text-xs">
													{filter.category}
												</Badge>
											</div>
										</Button>
									))}
								</div>
							</TabsContent>

							<TabsContent value="adjust" className="space-y-4">
								<Card>
									<CardHeader>
										<CardTitle className="text-sm">Quick Adjustments</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="quick-adjustments">
											{[
												{ name: 'Brighten', key: 'brightness', value: 0.2 },
												{ name: 'Darken', key: 'brightness', value: -0.2 },
												{ name: 'Increase Contrast', key: 'contrast', value: 0.3 },
												{ name: 'Decrease Contrast', key: 'contrast', value: -0.3 },
												{ name: 'Boost Saturation', key: 'saturation', value: 0.4 },
												{ name: 'Desaturate', key: 'saturation', value: -0.6 }
											].map((adjustment) => (
												<Button
													key={adjustment.name}
													variant="outline"
													size="sm"
													onClick={() => addAdjustmentOperation({ [adjustment.key]: adjustment.value })}
												>
													{adjustment.name}
												</Button>
											))}
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="organize" className="space-y-4">
								<Card>
									<CardHeader>
										<CardTitle className="text-sm">Batch Rename</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="rename-controls">
											<Select
												onValueChange={(value) => addRenameOperation(value)}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select rename pattern" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="{name}_edited">Add "_edited" suffix</SelectItem>
													<SelectItem value="{name}_{date}">Add date suffix</SelectItem>
													<SelectItem value="batch_{index}">Sequential numbering</SelectItem>
													<SelectItem value="photo_{index}_{date}">Date + number</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle className="text-sm">Batch Tag</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="tag-controls">
											<div className="quick-tags">
												{['edited', 'batch_processed', 'enhanced', 'filtered'].map((tag) => (
													<Button
														key={tag}
														variant="outline"
														size="sm"
														onClick={() => addBatchOperation({
															type: 'tag',
															name: `Add "${tag}" tag`,
															tags: [tag]
														})}
													>
														+ {tag}
													</Button>
												))}
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="queue" className="space-y-4">
								{batchOperations.length > 0 ? (
									<div className="operations-queue">
										{batchOperations.map((operation, index) => (
											<div key={index} className="operation-item">
												<div className="operation-info">
													{getOperationIcon(operation)}
													<span className="operation-name">{operation.name}</span>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => removeBatchOperation(index)}
												>
													<X className="w-4 h-4" />
												</Button>
											</div>
										))}
									</div>
								) : (
									<div className="empty-queue">
										<Clock className="w-8 h-8 text-muted-foreground" />
										<p className="text-sm text-muted-foreground">
											No operations in queue
										</p>
									</div>
								)}
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>

				{/* Processing Status */}
				{processingState.processing && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Processing Batch</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="processing-status">
								<div className="progress-info">
									<Progress
										value={(processingState.currentIndex / processingState.totalImages) * 100}
										className="mb-2"
									/>
									<p className="text-sm text-muted-foreground">
										Processing {processingState.currentIndex + 1} of {processingState.totalImages} images
									</p>
									{processingState.currentImage && (
										<p className="text-xs text-muted-foreground truncate">
											Current: {processingState.currentImage.split('/').pop()}
										</p>
									)}
								</div>

								<div className="processing-stats">
									<div className="stat">
										<Check className="w-4 h-4 text-green-600" />
										<span>{processingState.completedImages.length} completed</span>
									</div>
									<div className="stat">
										<X className="w-4 h-4 text-red-600" />
										<span>{processingState.failedImages.length} failed</span>
									</div>
								</div>

								{processingState.failedImages.length > 0 && (
									<div className="failed-images">
										<h5>Failed Images:</h5>
										{processingState.failedImages.map((failed, index) => (
											<div key={index} className="failed-item">
												<span className="path">{failed.path.split('/').pop()}</span>
												<span className="error">{failed.error}</span>
											</div>
										))}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Results */}
				{!processingState.processing && processingState.processedImages.length > 0 && (
					<Card>
						<CardHeader>
							<div className="flex justify-between items-center">
								<CardTitle className="text-base">
									Results ({processingState.processedImages.length})
								</CardTitle>
								<Button variant="outline" size="sm" onClick={downloadBatchResults}>
									<Download className="w-4 h-4 mr-2" />
									Download Results
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="results-grid">
								{processingState.processedImages.map((result, index) => (
									<div key={index} className="result-item">
										<div className="image-comparison">
											<div className="original">
												<img src={result.original} alt="Original" className="w-full h-20 object-cover" />
												<span className="label">Original</span>
											</div>
											<div className="processed">
												<img src={result.processed} alt="Processed" className="w-full h-20 object-cover" />
												<span className="label">Processed</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

export default BatchEditor;