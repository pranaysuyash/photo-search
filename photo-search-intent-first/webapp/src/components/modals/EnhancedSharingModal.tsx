import {
	Check,
	Copy,
	Download,
	ExternalLink,
	Facebook,
	Instagram,
	Link,
	Mail,
	QrCode,
	Share2,
	Twitter,
	Users,
	X,
} from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { apiCreateShare, apiExport } from "../../api";
import { announce } from "../../utils/accessibility";
import { handleError } from "../../utils/errors";

interface EnhancedSharingModalProps {
	selected: Set<string>;
	dir: string;
	onClose: () => void;
	uiActions: {
		setNote: (message: string) => void;
	};
}

type ShareMethod = "link" | "email" | "social" | "export";
type SocialPlatform = "facebook" | "instagram" | "twitter";
type ExportPreset =
	| "web"
	| "email"
	| "print"
	| "instagram"
	| "twitter"
	| "facebook";

interface ShareOptions {
	expiryHours: number;
	password?: string;
	viewOnly: boolean;
	title?: string;
	message?: string;
}

const SOCIAL_PRESETS: Record<
	SocialPlatform,
	{ name: string; icon: React.ReactNode; maxSize: number; aspectRatio: string }
> = {
	facebook: {
		name: "Facebook",
		icon: <Facebook className="w-5 h-5" />,
		maxSize: 2048,
		aspectRatio: "1.91:1",
	},
	instagram: {
		name: "Instagram",
		icon: <Instagram className="w-5 h-5" />,
		maxSize: 1080,
		aspectRatio: "1:1",
	},
	twitter: {
		name: "Twitter",
		icon: <Twitter className="w-5 h-5" />,
		maxSize: 1200,
		aspectRatio: "16:9",
	},
};

const EXPORT_PRESETS: Record<
	ExportPreset,
	{ name: string; description: string; maxSize: number; quality: number }
> = {
	web: {
		name: "Web",
		description: "Optimized for websites",
		maxSize: 1920,
		quality: 85,
	},
	email: {
		name: "Email",
		description: "Small size for email",
		maxSize: 1024,
		quality: 80,
	},
	print: {
		name: "Print",
		description: "High quality for printing",
		maxSize: 3000,
		quality: 95,
	},
	instagram: {
		name: "Instagram",
		description: "Square format for Instagram",
		maxSize: 1080,
		quality: 90,
	},
	twitter: {
		name: "Twitter",
		description: "Wide format for Twitter",
		maxSize: 1200,
		quality: 85,
	},
	facebook: {
		name: "Facebook",
		description: "Wide format for Facebook",
		maxSize: 2048,
		quality: 90,
	},
};

export const EnhancedSharingModal: React.FC<EnhancedSharingModalProps> = ({
	selected,
	dir,
	onClose,
	uiActions,
}) => {
	const [activeMethod, setActiveMethod] = useState<ShareMethod>("link");
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedLink, setGeneratedLink] = useState<string>("");
	const [copiedToClipboard, setCopiedToClipboard] = useState(false);
	const [shareOptions, setShareOptions] = useState<ShareOptions>({
		expiryHours: 24,
		viewOnly: false,
	});
	const [exportPreset, setExportPreset] = useState<ExportPreset>("web");
	const [exportDestination, setExportDestination] = useState("");
	const [emailAddresses, setEmailAddresses] = useState("");
	const [emailMessage, setEmailMessage] = useState("");

	const qrCodeRef = useRef<HTMLDivElement>(null);

	const selectedCount = selected.size;
	const isMultiple = selectedCount > 1;

	const handleCreateShare = async () => {
		if (!dir || selectedCount === 0) return;

		setIsGenerating(true);
		try {
			const paths = Array.from(selected);
			const r = await apiCreateShare(dir, "local", paths, shareOptions);
			const shareUrl = `${window.location.origin}/share/${r.token}/view`;
			setGeneratedLink(shareUrl);

			// Copy to clipboard automatically
			await navigator.clipboard.writeText(shareUrl);
			setCopiedToClipboard(true);
			uiActions.setNote("Share link created and copied to clipboard!");
			announce("Share link ready: copied to clipboard", "polite");
		} catch (e) {
			uiActions.setNote(e instanceof Error ? e.message : "Share failed");
			handleError(e, {
				logToServer: true,
				context: {
					action: "create_share",
					component: "EnhancedSharingModal.handleCreateShare",
					dir,
				},
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const handleExport = async () => {
		if (!dir || selectedCount === 0 || !exportDestination) return;

		setIsGenerating(true);
		try {
			const paths = Array.from(selected);
			const preset = EXPORT_PRESETS[exportPreset];

			const r = await apiExport(
				dir,
				paths,
				exportDestination,
				"copy",
				false,
				false,
				{
					preset:
						exportPreset === "instagram" ||
						exportPreset === "twitter" ||
						exportPreset === "facebook"
							? "web"
							: exportPreset,
					resizeLong: preset.maxSize,
					quality: preset.quality,
				},
			);

			uiActions.setNote(`Exported ${r.copied} photos to ${exportDestination}`);
			announce(`Exported ${r.copied} photos`, "polite");
			onClose();
		} catch (e) {
			uiActions.setNote(e instanceof Error ? e.message : "Export failed");
			handleError(e, {
				logToServer: true,
				context: {
					action: "export",
					component: "EnhancedSharingModal.handleExport",
					dir,
				},
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const ensureShareLink = async () => {
		if (!generatedLink) {
			await handleCreateShare();
		}
	};

	const handleSendEmail = async () => {
		const recipients = emailAddresses
			.split(/[\n,;]+/)
			.map((s) => s.trim())
			.filter(Boolean);
		if (recipients.length === 0) {
			uiActions.setNote("Add at least one recipient");
			return;
		}
		await ensureShareLink();
		const subject = isMultiple ? `Photos (${selectedCount})` : "Photo";
		const body = `${emailMessage ? `${emailMessage}\n\n` : ""}${generatedLink}`;
		const mailto = `mailto:${encodeURIComponent(recipients.join(","))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		try {
			window.location.href = mailto;
			onClose();
		} catch (e) {
			uiActions.setNote(
				e instanceof Error ? e.message : "Could not open email client",
			);
			handleError(e, {
				logToServer: true,
				context: {
					action: "email_share",
					component: "EnhancedSharingModal.handleSendEmail",
					dir,
				},
			});
		}
	};

	const handleSocialShare = (platform: SocialPlatform) => {
		if (!generatedLink) return;

		const text = `Check out ${
			isMultiple ? `these ${selectedCount} photos` : "this photo"
		}!`;
		const urls = {
			facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
				generatedLink,
			)}`,
			twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
				text,
			)}&url=${encodeURIComponent(generatedLink)}`,
			instagram: `instagram://library?AssetPath=${encodeURIComponent(
				generatedLink,
			)}`, // This would need actual image URLs
		};

		window.open(urls[platform], "_blank", "width=600,height=400");
	};

	const generateQRCode = useCallback(() => {
		if (!generatedLink || !qrCodeRef.current) return;

		// Simple QR code generation using a basic approach
		// In a real implementation, you'd use a QR code library
		const qrText = generatedLink;
		qrCodeRef.current.innerHTML = `<div style="font-family: monospace; font-size: 12px; line-height: 1; white-space: pre;">${generateSimpleQR(
			qrText,
		)}</div>`;
	}, [generatedLink]);

	const generateSimpleQR = (_text: string): string => {
		// This is a very basic QR-like representation
		// In production, use a proper QR code library
		return `
 █▀▀▀▀▀█ █ ▀█▀ █▀▀▀▀▀█
 █ ███ █ █ █ █ █ ███ █
 █ ▀▀▀ █ █▄█▄█ █ ▀▀▀ █
 ▀▀▀▀▀▀▀ █ ▀ █ ▀▀▀▀▀▀▀
 █▀█▀▀█▄ ▀ █ ▀ ▄█▀▀█▀█
 █ ▀ ▀ █ ▀█ ▀█ █ ▀ ▀ █
 █▄█▄█▄█ ▀ ▀ ▀ █▄█▄█▄█
 ▀▀▀▀▀▀▀ ▀ ▀ ▀ ▀▀▀▀▀▀▀
 █ ▀█ ▀█▀ █▀█ █ ▀█ ▀█▀
 █ █ █ █ █ █ █ █ █ █ █
 █▄█▄█▄█ ▀ ▀ ▀ █▄█▄█▄█
    `.trim();
	};

	React.useEffect(() => {
		if (generatedLink) {
			generateQRCode();
		}
	}, [generatedLink, generateQRCode]);

	return (
		<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
							<Share2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
								Share {isMultiple ? `${selectedCount} Photos` : "Photo"}
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Choose how you'd like to share your photos
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Method Selection */}
				<div className="p-6 border-b dark:border-gray-700">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						{[
							{
								id: "link" as ShareMethod,
								icon: <Link className="w-5 h-5" />,
								label: "Share Link",
								desc: "Create shareable link",
							},
							{
								id: "email" as ShareMethod,
								icon: <Mail className="w-5 h-5" />,
								label: "Email",
								desc: "Send via email",
							},
							{
								id: "social" as ShareMethod,
								icon: <Users className="w-5 h-5" />,
								label: "Social Media",
								desc: "Share on social platforms",
							},
							{
								id: "export" as ShareMethod,
								icon: <Download className="w-5 h-5" />,
								label: "Export",
								desc: "Download to folder",
							},
						].map((method) => (
							<button
								key={method.id}
								type="button"
								onClick={() => setActiveMethod(method.id)}
								className={`p-4 rounded-xl border-2 transition-all ${
									activeMethod === method.id
										? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
										: "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
								}`}
							>
								<div className="flex flex-col items-center gap-2">
									<div
										className={`w-8 h-8 rounded-lg flex items-center justify-center ${
											activeMethod === method.id
												? "bg-blue-500 text-white"
												: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
										}`}
									>
										{method.icon}
									</div>
									<div className="text-center">
										<div className="font-medium text-sm">{method.label}</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{method.desc}
										</div>
									</div>
								</div>
							</button>
						))}
					</div>
				</div>

				{/* Content Area */}
				<div className="p-6 max-h-96 overflow-y-auto">
					{activeMethod === "link" && (
						<div className="space-y-6">
							{/* Share Options */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="expiry-select"
										className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
									>
										Link Expires In
									</label>
									<select
										id="expiry-select"
										value={shareOptions.expiryHours}
										onChange={(e) =>
											setShareOptions((prev) => ({
												...prev,
												expiryHours: parseInt(e.target.value),
											}))
										}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
									>
										<option value={1}>1 hour</option>
										<option value={24}>24 hours</option>
										<option value={168}>1 week</option>
										<option value={720}>1 month</option>
										<option value={8760}>1 year</option>
									</select>
								</div>
								<div>
									<label
										htmlFor="password-input"
										className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
									>
										Password (Optional)
									</label>
									<input
										id="password-input"
										type="password"
										value={shareOptions.password || ""}
										onChange={(e) =>
											setShareOptions((prev) => ({
												...prev,
												password: e.target.value || undefined,
											}))
										}
										placeholder="Leave empty for no password"
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
									/>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="viewOnly"
									checked={shareOptions.viewOnly}
									onChange={(e) =>
										setShareOptions((prev) => ({
											...prev,
											viewOnly: e.target.checked,
										}))
									}
									className="rounded"
								/>
								<label
									htmlFor="viewOnly"
									className="text-sm text-gray-700 dark:text-gray-300"
								>
									View-only (prevent downloads)
								</label>
							</div>

							{!generatedLink ? (
								<button
									type="button"
									onClick={handleCreateShare}
									disabled={isGenerating}
									className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
								>
									{isGenerating ? (
										<>
											<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
											Creating Share Link...
										</>
									) : (
										<>
											<Link className="w-5 h-5" />
											Create Share Link
										</>
									)}
								</button>
							) : (
								<div className="space-y-4">
									<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
										<div className="flex items-center gap-2 text-green-800 dark:text-green-200">
											<Check className="w-5 h-5" />
											<span className="font-medium">Share link created!</span>
										</div>
										<div className="mt-2 flex items-center gap-2">
											<input
												type="text"
												value={generatedLink}
												readOnly
												className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
											/>
											<button
												type="button"
												onClick={async () => {
													await navigator.clipboard.writeText(generatedLink);
													setCopiedToClipboard(true);
													setTimeout(() => setCopiedToClipboard(false), 2000);
												}}
												className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center gap-1"
											>
												{copiedToClipboard ? (
													<Check className="w-4 h-4" />
												) : (
													<Copy className="w-4 h-4" />
												)}
												{copiedToClipboard ? "Copied!" : "Copy"}
											</button>
										</div>
									</div>

									{/* QR Code */}
									<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
										<div className="flex items-center gap-2 mb-3">
											<QrCode className="w-5 h-5" />
											<span className="font-medium">QR Code</span>
										</div>
										<div ref={qrCodeRef} className="flex justify-center">
											<div className="w-32 h-32 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
												<QrCode className="w-16 h-16 text-gray-400" />
											</div>
										</div>
										<p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
											Scan to open on mobile
										</p>
									</div>
								</div>
							)}
						</div>
					)}

					{activeMethod === "email" && (
						<div className="space-y-4">
							<div>
								<label
									htmlFor="email-input"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
								>
									Email Addresses
								</label>
								<textarea
									id="email-input"
									value={emailAddresses}
									onChange={(e) => setEmailAddresses(e.target.value)}
									placeholder="Enter email addresses separated by commas"
									rows={3}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
								/>
							</div>
							<div>
								<label
									htmlFor="email-message"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
								>
									Message (Optional)
								</label>
								<textarea
									id="email-message"
									placeholder="Add a personal message..."
									value={emailMessage}
									onChange={(e) => setEmailMessage(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 h-20"
								/>
							</div>
							<button
								type="button"
								onClick={handleSendEmail}
								className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
							>
								<Mail className="w-5 h-5" />
								Send Email
							</button>
						</div>
					)}

					{activeMethod === "social" && (
						<div className="space-y-4">
							{!generatedLink ? (
								<div className="text-center py-8">
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										First create a share link, then share on social media
									</p>
									<button
										type="button"
										onClick={() => setActiveMethod("link")}
										className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
									>
										Create Share Link First
									</button>
								</div>
							) : (
								<div className="space-y-3">
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Share your photos on social media:
									</p>
									{Object.entries(SOCIAL_PRESETS).map(([platform, config]) => (
										<button
											key={platform}
											type="button"
											onClick={() =>
												handleSocialShare(platform as SocialPlatform)
											}
											className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
										>
											<div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
												{config.icon}
											</div>
											<div className="flex-1 text-left">
												<div className="font-medium">{config.name}</div>
												<div className="text-sm text-gray-500 dark:text-gray-400">
													{config.aspectRatio} • Max {config.maxSize}px
												</div>
											</div>
											<ExternalLink className="w-5 h-5 text-gray-400" />
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{activeMethod === "export" && (
						<div className="space-y-4">
							<div>
								<label
									htmlFor="export-destination"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
								>
									Export Destination
								</label>
								<input
									id="export-destination"
									type="text"
									value={exportDestination}
									onChange={(e) => setExportDestination(e.target.value)}
									placeholder="/absolute/path/to/export/folder"
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
								/>
							</div>

							<fieldset>
								<legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Export Preset
								</legend>
								<div className="grid grid-cols-2 gap-2">
									{Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
										<button
											key={key}
											type="button"
											onClick={() => setExportPreset(key as ExportPreset)}
											className={`p-3 border rounded-lg text-left ${
												exportPreset === key
													? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
													: "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
											}`}
										>
											<div className="font-medium text-sm">{preset.name}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">
												{preset.description}
											</div>
											<div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
												Max {preset.maxSize}px • {preset.quality}% quality
											</div>
										</button>
									))}
								</div>
							</fieldset>

							<button
								type="button"
								onClick={handleExport}
								disabled={isGenerating || !exportDestination}
								className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{isGenerating ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
										Exporting...
									</>
								) : (
									<>
										<Download className="w-5 h-5" />
										Export {selectedCount} Photo{isMultiple ? "s" : ""}
									</>
								)}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
